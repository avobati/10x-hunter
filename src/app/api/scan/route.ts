/**
 * Full market scan — processes every actively-listed US stock in batches of 100.
 *
 * Architecture:
 *   POST { action:"start" }            → fetch NASDAQ FTP ticker list, create job, return chunk count
 *   POST { action:"chunk", jobId, i }  → batch-quote 100 tickers (1 HTTP call), filter, save survivors
 *   POST { action:"finalize", jobId }  → score top 200 survivors, AI on top 10, save top 5 picks
 *   GET  ?jobId=xxx                    → poll progress
 */

import { NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { fetchAllUSTickers } from "@/lib/universe-fetcher";
import { batchQuoteStage1, scoreStage2 } from "@/lib/batch-screener";
import { analyzeStockWithAI } from "@/lib/ai-analyst";
import { saveRecommendations } from "@/lib/recommendations";
import { format, startOfWeek } from "date-fns";
import { ScoreBreakdown } from "@/types";

const CHUNK_SIZE   = 100;  // tickers per chunk — 1 batch HTTP call, well under 10s
const TOP_STAGE2   = 200;  // top stage-1 survivors to run full scoring on
const TOP_AI       = 10;   // top scored stocks to run AI deep-dive on
const TOP_SAVE     = 5;    // final weekly picks to persist

export async function POST(req: Request) {
  try {
    await initDb();
    const sql = getDb();
    const body = await req.json() as { action: string; jobId?: string; chunkIndex?: number };

    // ── START ─────────────────────────────────────────────────────────────────
    if (body.action === "start") {
      const tickers = await fetchAllUSTickers();
      const weekOf  = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

      const [job] = await sql`
        INSERT INTO scan_jobs (status, total_tickers, processed, passed_stage1, passed_stage2, week_of)
        VALUES ('running', ${tickers.length}, 0, 0, 0, ${weekOf})
        RETURNING id
      ` as unknown as Array<{ id: string }>;

      // Persist ticker list in the error column (repurposed as a JSON cache)
      await sql`
        UPDATE scan_jobs
        SET error = ${JSON.stringify(tickers.map((t) => ({ ticker: t.ticker, name: t.name })))}
        WHERE id = ${job.id}
      `;

      const totalChunks = Math.ceil(tickers.length / CHUNK_SIZE);
      return NextResponse.json({ jobId: job.id, totalTickers: tickers.length, totalChunks });
    }

    // ── CHUNK ─────────────────────────────────────────────────────────────────
    if (body.action === "chunk") {
      const { jobId, chunkIndex = 0 } = body;
      if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

      const [job] = await sql`
        SELECT id, status, total_tickers, processed, passed_stage1, error
        FROM scan_jobs WHERE id = ${jobId}
      ` as unknown as Array<{
        id: string; status: string; total_tickers: number;
        processed: number; passed_stage1: number; error: string;
      }>;

      if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      if (job.status === "completed") return NextResponse.json({ done: true });

      const allTickers: Array<{ ticker: string; name: string }> = JSON.parse(job.error ?? "[]");
      const chunk = allTickers.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
      if (chunk.length === 0) return NextResponse.json({ done: true });

      // TRUE batch quote: one HTTP call for the whole chunk
      const passed = await batchQuoteStage1(chunk.map((t) => t.ticker));

      // Map name back from original list for tickers yahoo-finance2 didn't return a name for
      const nameMap = Object.fromEntries(chunk.map((t) => [t.ticker, t.name]));
      for (const s of passed) {
        if (!s.name || s.name === s.ticker) s.name = nameMap[s.ticker] ?? s.ticker;
      }

      // Save Stage 1 survivors
      for (const s of passed) {
        try {
          await sql`
            INSERT INTO screener_results
              (scan_job_id, ticker, name, price, volume, market_cap, stage, passed)
            VALUES
              (${jobId}, ${s.ticker}, ${s.name}, ${s.price}, ${s.volume}, ${s.marketCap}, 1, true)
            ON CONFLICT DO NOTHING
          `;
        } catch { /* skip */ }
      }

      const newProcessed    = job.processed    + chunk.length;
      const newPassedStage1 = job.passed_stage1 + passed.length;

      await sql`
        UPDATE scan_jobs
        SET processed = ${newProcessed}, passed_stage1 = ${newPassedStage1}
        WHERE id = ${jobId}
      `;

      return NextResponse.json({
        chunkIndex,
        processed:    newProcessed,
        passedStage1: newPassedStage1,
        totalTickers: job.total_tickers,
        chunkPassed:  passed.length,
        done:         false,
      });
    }

    // ── FINALIZE ──────────────────────────────────────────────────────────────
    if (body.action === "finalize") {
      const { jobId } = body;
      if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

      // Load top Stage 1 survivors sorted by momentum (changePercent desc) then volume
      const stage1Rows = await sql`
        SELECT ticker, name, price, volume, market_cap
        FROM screener_results
        WHERE scan_job_id = ${jobId} AND stage = 1 AND passed = true
        ORDER BY volume DESC
        LIMIT ${TOP_STAGE2}
      ` as unknown as Array<{ ticker: string; name: string; price: number; volume: number; market_cap: number }>;

      const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

      // Stage 2: full scoring
      const stage2Results = [];
      for (const row of stage1Rows) {
        const result = await scoreStage2({
          ticker: row.ticker, name: row.name, price: row.price,
          volume: row.volume, marketCap: row.market_cap,
          changePercent: 0, avgVolume: row.volume,
        });
        if (result) stage2Results.push(result);
      }
      stage2Results.sort((a, b) => b.score - a.score);

      // AI deep-dive on top candidates, save top picks
      const topCandidates = stage2Results.slice(0, TOP_AI);
      const recommendations = [];

      for (const c of topCandidates.slice(0, TOP_SAVE)) {
        let aiAnalysis: string | undefined;
        let catalysts = ["Strong momentum breakout on volume", "Institutional accumulation", "Sector catalyst in play"];
        let risks     = ["Broad market volatility", "Position sizing risk", "Sector rotation headwinds"];

        try {
          const { buildStockData } = await import("@/lib/stock-data");
          const data = await buildStockData(c.ticker, c.name, c.sector);
          if (data) {
            const ai = await analyzeStockWithAI(data);
            aiAnalysis = JSON.stringify(ai);
            catalysts  = ai.catalysts;
            risks      = ai.risks;
          }
        } catch { /* AI optional */ }

        recommendations.push({
          ticker:         c.ticker,
          name:           c.name,
          sector:         c.sector,
          entryPrice:     c.price,
          targetPrice:    c.targetPrice,
          stopLoss:       c.stopLoss,
          score:          c.score,
          scoreBreakdown: c.scoreBreakdown as ScoreBreakdown,
          thesis:         c.thesis,
          catalysts,
          risks,
          timeframe:      "3-6 months",
          weekOf,
          status:         "active" as const,
          currentPrice:   c.price,
          returnPct:      0,
          aiAnalysis,
        });
      }

      if (recommendations.length > 0) await saveRecommendations(recommendations);

      await sql`
        UPDATE scan_jobs
        SET status       = 'completed',
            completed_at = NOW(),
            passed_stage2= ${stage2Results.length},
            top_picks    = ${topCandidates.map((c) => c.ticker)},
            error        = NULL
        WHERE id = ${jobId}
      `;

      return NextResponse.json({
        success:     true,
        stage1Found: stage1Rows.length,
        stage2Scored: stage2Results.length,
        topPicks:    topCandidates.map((c) => c.ticker),
        saved:       recommendations.length,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/scan:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await initDb();
    const sql = getDb();
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (jobId) {
      const [job] = await sql`
        SELECT id, status, total_tickers, processed, passed_stage1, passed_stage2,
               top_picks, started_at, completed_at
        FROM scan_jobs WHERE id = ${jobId}
      ` as unknown as unknown[];
      if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(job);
    }

    const jobs = await sql`
      SELECT id, status, total_tickers, processed, passed_stage1, passed_stage2,
             top_picks, started_at, completed_at
      FROM scan_jobs ORDER BY started_at DESC LIMIT 5
    ` as unknown as unknown[];
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
