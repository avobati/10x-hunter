/**
 * POST /api/rescan  — Quick scan on the curated 80-stock universe.
 * Uses live Yahoo Finance prices via yahoo-finance2.
 *
 * Algorithm:
 *  1. Close active picks from PREVIOUS weeks (keep current-week active if re-running)
 *  2. Score all 80 curated stocks with live prices (true batch quote per 20 stocks)
 *  3. AI deep-dive (Claude) on top 8 candidates
 *  4. Upsert top 5 as this week's picks (idempotent — safe to re-run)
 *  5. Immediately refresh current_price on all new picks
 */

import { NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { SCAN_UNIVERSE } from "@/lib/universe";
import { buildStockData } from "@/lib/stock-data";
import { scoreStock, calculateTargets, generateThesis, isBaseEligible } from "@/lib/scoring-engine";
import { fetchUtbotBuyRecommendations } from "@/lib/finviz-utbot";
import { analyzeStockWithAI } from "@/lib/ai-analyst";
import { saveRecommendations } from "@/lib/recommendations";
import { format, startOfWeek } from "date-fns";

export const maxDuration = 300; // Vercel Pro: up to 5 minutes

export async function POST() {
  try {
    await initDb();
    const sql = getDb();
    const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    // Step 1: Archive ALL currently active picks before generating fresh ones.
    // This guarantees exactly TOP_SAVE clean new picks after the scan — no stale leftovers.
    const activeBefore = await sql`
      SELECT id, ticker, entry_price
      FROM recommendations
      WHERE status = 'active'
    ` as unknown as Array<{ id: string; ticker: string; entry_price: string }>;
    const activeByTicker = new Map(activeBefore.map((row) => [row.ticker, row]));

    // Step 2: Use Finviz UTBot BUY recency as the base gate, then enrich with Yahoo.
    const utbot = await fetchUtbotBuyRecommendations(220);
    const utbotByTicker = new Map(utbot.map((row) => [row.ticker, row]));
    const scanUniverse = utbot.length > 0
      ? utbot.map((row) => ({
          ticker: row.ticker,
          name: row.name,
          sector: row.sector,
        }))
      : SCAN_UNIVERSE;

    const CONCURRENCY = 10;
    const allScored: Array<{
      ticker: string; name: string; sector: string;
      score: number; data: Awaited<ReturnType<typeof buildStockData>>;
    }> = [];

    for (let i = 0; i < scanUniverse.length; i += CONCURRENCY) {
      const batch = scanUniverse.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (stock) => {
          const signal = utbotByTicker.get(stock.ticker);
          const data = await Promise.race([
            buildStockData(stock.ticker, stock.name, stock.sector, signal ? {
              barsSinceBuy: signal.barsSinceBuy,
              score: signal.score,
              signalPrice: signal.signalPrice,
              currentPrice: signal.currentPrice,
            } : undefined),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 7_000)),
          ]);
          if (!data || data.price === 0) return null;
          if (!isBaseEligible(data)) return null;
          const breakdown = scoreStock(data);
          return { ticker: stock.ticker, name: stock.name, sector: stock.sector, score: breakdown.total, data };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) allScored.push(r.value);
      }
    }

    allScored.sort((a, b) => b.score - a.score);
    const topCandidates = allScored.slice(0, 8);

    // Step 3: AI deep-dive + build recommendation objects
    const recommendations = [];

    for (const candidate of topCandidates.slice(0, 5)) {
      if (!candidate.data) continue;

      const breakdown  = scoreStock(candidate.data);
      const { targetPrice, stopLoss } = calculateTargets(candidate.data, breakdown.total);
      const thesis     = generateThesis(candidate.data, breakdown);
      const existing = activeByTicker.get(candidate.ticker);
      const entryPrice = existing ? parseFloat(String(existing.entry_price)) : candidate.data.price;
      const returnPct = entryPrice > 0 ? ((candidate.data.price - entryPrice) / entryPrice) * 100 : 0;

      let aiAnalysis: string | undefined;
      let catalysts = [
        "Price momentum accelerating above 50-day MA on elevated volume",
        "Sector tailwinds and increasing institutional interest",
        "Strong revenue growth trajectory with improving margins",
      ];
      let risks = [
        "Broader market correction could pressure high-beta names",
        "Earnings disappointment risk given elevated expectations",
        "Position concentration in volatile sector",
      ];

      try {
        const ai = await analyzeStockWithAI(candidate.data);
        aiAnalysis = JSON.stringify(ai);
        catalysts  = ai.catalysts;
        risks      = ai.risks;
      } catch { /* AI is optional */ }

      recommendations.push({
        ticker:         candidate.ticker,
        name:           candidate.name,
        sector:         candidate.sector,
        entryPrice,
        targetPrice,
        stopLoss,
        score:          breakdown.total,
        scoreBreakdown: breakdown,
        thesis,
        catalysts,
        risks,
        timeframe:      "3-6 months",
        weekOf,
        status:         "active" as const,
        currentPrice:   candidate.data.price,
        returnPct,
        aiAnalysis,
      });
    }

    const returnedTickers = recommendations.map((r) => r.ticker);
    const returnedTickerSet = new Set(returnedTickers);
    const inserted: string[] = [];
    const retained: string[] = [];

    if (returnedTickers.length > 0) {
      await sql`
        UPDATE recommendations
        SET
          status       = 'closed',
          closed_at    = NOW(),
          closed_price = COALESCE(current_price, entry_price),
          return_pct   = ROUND(
            ((COALESCE(current_price, entry_price) - entry_price) / NULLIF(entry_price, 0) * 100)::numeric, 4
          )
        WHERE status = 'active'
          AND NOT (ticker = ANY(${returnedTickers}))
      `;
    } else {
      await sql`
        UPDATE recommendations
        SET
          status       = 'closed',
          closed_at    = NOW(),
          closed_price = COALESCE(current_price, entry_price),
          return_pct   = ROUND(
            ((COALESCE(current_price, entry_price) - entry_price) / NULLIF(entry_price, 0) * 100)::numeric, 4
          )
        WHERE status = 'active'
      `;
    }

    for (const rec of recommendations) {
      const existing = activeByTicker.get(rec.ticker);
      if (existing) {
        retained.push(rec.ticker);
        await sql`
          UPDATE recommendations
          SET
            name            = ${rec.name},
            sector          = ${rec.sector},
            target_price    = ${rec.targetPrice},
            stop_loss       = ${rec.stopLoss},
            score           = ${rec.score},
            score_breakdown = ${JSON.stringify(rec.scoreBreakdown)},
            thesis          = ${rec.thesis},
            catalysts       = ${rec.catalysts},
            risks           = ${rec.risks},
            timeframe       = ${rec.timeframe},
            current_price   = ${rec.currentPrice ?? rec.entryPrice},
            return_pct      = ROUND(((${rec.currentPrice ?? rec.entryPrice} - entry_price) / NULLIF(entry_price, 0) * 100)::numeric, 4),
            ai_analysis     = COALESCE(${rec.aiAnalysis ?? null}, ai_analysis)
          WHERE id = ${existing.id}
        `;
      } else {
        inserted.push(rec.ticker);
        await saveRecommendations([rec]);
      }
    }

    // Step 4: Refresh current_price for all active picks right now
    const activeTickers = await sql`
      SELECT ticker FROM recommendations WHERE status = 'active'
    ` as unknown as Array<{ ticker: string }>;

    if (activeTickers.length > 0) {
      const { fetchQuotes } = await import("@/lib/stock-data");
      const quotes = await fetchQuotes(activeTickers.map((r) => r.ticker));
      for (const q of quotes) {
        if (!q.price || q.price <= 0) continue;
        await sql`
          UPDATE recommendations
          SET
            current_price = ${q.price},
            return_pct    = ROUND(((${q.price} - entry_price) / NULLIF(entry_price, 0) * 100)::numeric, 4)
          WHERE ticker = ${q.ticker} AND status = 'active'
        `;
      }
    }

    return NextResponse.json({
      success:  true,
      scanned:  scanUniverse.length,
      passedBase: allScored.length,
      saved:    recommendations.length,
      inserted,
      retained,
      closed: activeBefore.map((r) => r.ticker).filter((ticker) => !returnedTickerSet.has(ticker)),
      topPicks: recommendations.map((r) => r.ticker),
      weekOf,
    });
  } catch (error) {
    console.error("POST /api/rescan:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
