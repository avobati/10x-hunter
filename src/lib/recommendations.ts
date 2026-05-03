import { getDb } from "./db";
import { Recommendation, PerformanceMetrics } from "@/types";
import { scoreStock, calculateTargets, generateThesis } from "./scoring-engine";
import { buildStockData, fetchQuotes } from "./stock-data";
import { SCAN_UNIVERSE } from "./universe";
import { analyzeStockWithAI } from "./ai-analyst";
import { format, startOfWeek } from "date-fns";

// ── Get All Recommendations ───────────────────────────────────────────────────
export async function getRecommendations(
  status?: "active" | "closed" | "stopped"
): Promise<Recommendation[]> {
  const sql = getDb();
  try {
    const rows = status
      ? await sql`SELECT * FROM recommendations WHERE status = ${status} ORDER BY score DESC, created_at DESC`
      : await sql`SELECT * FROM recommendations ORDER BY score DESC, created_at DESC`;
    return (rows as Record<string, unknown>[]).map(mapRow);
  } catch (e) {
    console.error("getRecommendations error:", e);
    return [];
  }
}

// ── Update Current Prices ─────────────────────────────────────────────────────
export async function updatePrices(tickers: string[]): Promise<void> {
  const sql = getDb();
  const quotes = await fetchQuotes(tickers);

  for (const quote of quotes) {
    if (!quote.price || quote.price <= 0) continue;
    try {
      await sql`
        UPDATE recommendations
        SET current_price = ${quote.price},
            return_pct    = ROUND(((${quote.price} - entry_price) / entry_price * 100)::numeric, 4)
        WHERE ticker = ${quote.ticker} AND status = 'active'
      `;
    } catch (e) {
      console.error(`updatePrices error for ${quote.ticker}:`, e);
    }
  }
}

// ── Close a Position ──────────────────────────────────────────────────────────
export async function closePosition(id: string, closedPrice: number): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE recommendations
    SET status       = 'closed',
        closed_at    = NOW(),
        closed_price = ${closedPrice},
        return_pct   = ROUND(((${closedPrice} - entry_price) / entry_price * 100)::numeric, 4)
    WHERE id = ${id}
  `;
}

// ── Performance Metrics ───────────────────────────────────────────────────────
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  const sql = getDb();

  try {
    const [allRows, activeRows] = await Promise.all([
      sql`SELECT * FROM recommendations`,
      sql`SELECT * FROM recommendations WHERE status = 'active'`,
    ]);

    const all    = allRows    as Record<string, unknown>[];
    const active = activeRows as Record<string, unknown>[];
    const closed = all.filter((r) => r.status === "closed" || r.status === "stopped");

    const returns = closed.map((r) => parseFloat(String(r.return_pct ?? "0")));
    const winners = returns.filter((r) => r > 0);
    const losers  = returns.filter((r) => r <= 0);

    const avgReturn  = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const bestReturn = returns.length ? Math.max(...returns) : 0;
    const worstReturn= returns.length ? Math.min(...returns) : 0;

    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((sq, r) => sq + (r - avgReturn) ** 2, 0) / returns.length)
      : 1;
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    const tenXCandidates = all.filter((r) => {
      const tp = parseFloat(String(r.target_price));
      const ep = parseFloat(String(r.entry_price));
      return ep > 0 && tp / ep >= 10;
    }).length;

    return {
      totalRecommendations:  all.length,
      activeRecommendations: active.length,
      winners:  winners.length,
      losers:   losers.length,
      winRate:  closed.length ? (winners.length / closed.length) * 100 : 0,
      avgReturn,
      bestReturn,
      worstReturn,
      avgHoldingDays: 0,
      totalReturnPct: returns.reduce((a, b) => a + b, 0),
      sharpeRatio,
      tenXCandidates,
    };
  } catch (e) {
    console.error("getPerformanceMetrics error:", e);
    return {
      totalRecommendations: 0, activeRecommendations: 0, winners: 0, losers: 0,
      winRate: 0, avgReturn: 0, bestReturn: 0, worstReturn: 0, avgHoldingDays: 0,
      totalReturnPct: 0, sharpeRatio: 0, tenXCandidates: 0,
    };
  }
}

// ── Save Recommendations ──────────────────────────────────────────────────────
export async function saveRecommendations(
  recs: Omit<Recommendation, "id" | "createdAt">[]
): Promise<void> {
  const sql = getDb();

  for (const rec of recs) {
    try {
      await sql`
        INSERT INTO recommendations (
          ticker, name, sector, entry_price, target_price, stop_loss,
          score, score_breakdown, thesis, catalysts, risks, timeframe,
          week_of, status, current_price, return_pct, ai_analysis
        ) VALUES (
          ${rec.ticker},
          ${rec.name},
          ${rec.sector},
          ${rec.entryPrice},
          ${rec.targetPrice},
          ${rec.stopLoss},
          ${rec.score},
          ${JSON.stringify(rec.scoreBreakdown)},
          ${rec.thesis},
          ${rec.catalysts},
          ${rec.risks},
          ${rec.timeframe},
          ${rec.weekOf},
          ${rec.status},
          ${rec.currentPrice ?? rec.entryPrice},
          ${rec.returnPct ?? 0},
          ${rec.aiAnalysis ?? null}
        )
        ON CONFLICT DO NOTHING
      `;
    } catch (e) {
      console.error(`saveRecommendations error for ${rec.ticker}:`, e);
    }
  }
}

// ── Run Weekly Scan ───────────────────────────────────────────────────────────
export async function runWeeklyScan(): Promise<{
  recommendations: Omit<Recommendation, "id" | "createdAt">[];
  stocksScanned: number;
  topPicks: string[];
}> {
  const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const scored: Array<{
    ticker: string; name: string; sector: string; score: number;
    data: Awaited<ReturnType<typeof buildStockData>>;
  }> = [];

  for (const stock of SCAN_UNIVERSE) {
    try {
      const data = await buildStockData(stock.ticker, stock.name, stock.sector);
      if (!data || data.price === 0) continue;
      const breakdown = scoreStock(data);
      scored.push({ ticker: stock.ticker, name: stock.name, sector: stock.sector, score: breakdown.total, data });
    } catch {
      continue;
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, 5);
  const recommendations: Omit<Recommendation, "id" | "createdAt">[] = [];

  for (const candidate of topCandidates) {
    if (!candidate.data) continue;
    const scoreBreakdown = scoreStock(candidate.data);
    const { targetPrice, stopLoss } = calculateTargets(candidate.data, scoreBreakdown.total);
    const thesis = generateThesis(candidate.data, scoreBreakdown);

    let aiAnalysis: string | undefined;
    let catalysts = ["Momentum breakout", "Sector rotation", "Volume surge"];
    let risks     = ["Market volatility", "Earnings miss", "Sector headwinds"];

    try {
      const ai = await analyzeStockWithAI(candidate.data);
      aiAnalysis = JSON.stringify(ai);
      catalysts  = ai.catalysts;
      risks      = ai.risks;
    } catch { /* AI optional */ }

    recommendations.push({
      ticker: candidate.ticker, name: candidate.name, sector: candidate.sector,
      entryPrice: candidate.data.price, targetPrice, stopLoss,
      score: scoreBreakdown.total, scoreBreakdown, thesis, catalysts, risks,
      timeframe: "3-6 months", weekOf, status: "active",
      currentPrice: candidate.data.price, returnPct: 0, aiAnalysis,
    });
  }

  return { recommendations, stocksScanned: scored.length, topPicks: topCandidates.map((c) => c.ticker) };
}

// ── Row mapper ────────────────────────────────────────────────────────────────
function mapRow(r: Record<string, unknown>): Recommendation {
  return {
    id:       String(r.id),
    ticker:   String(r.ticker),
    name:     String(r.name),
    sector:   String(r.sector ?? ""),
    entryPrice:  parseFloat(String(r.entry_price)),
    targetPrice: parseFloat(String(r.target_price)),
    stopLoss:    parseFloat(String(r.stop_loss)),
    score:       parseFloat(String(r.score)),
    scoreBreakdown: (() => {
      try {
        return typeof r.score_breakdown === "string"
          ? JSON.parse(r.score_breakdown)
          : r.score_breakdown;
      } catch { return { momentum:0, fundamental:0, technical:0, catalyst:0, riskReward:0, total:0 }; }
    })() as Recommendation["scoreBreakdown"],
    thesis:    String(r.thesis ?? ""),
    catalysts: Array.isArray(r.catalysts) ? r.catalysts.map(String) : [],
    risks:     Array.isArray(r.risks)     ? r.risks.map(String)     : [],
    timeframe: String(r.timeframe ?? "3-6 months"),
    weekOf:    String(r.week_of),
    status:    r.status as "active" | "closed" | "stopped",
    currentPrice: r.current_price != null ? parseFloat(String(r.current_price)) : undefined,
    returnPct:    r.return_pct    != null ? parseFloat(String(r.return_pct))    : undefined,
    closedAt:  r.closed_at  ? new Date(String(r.closed_at))  : undefined,
    closedPrice: r.closed_price != null ? parseFloat(String(r.closed_price)) : undefined,
    aiAnalysis:  r.ai_analysis ? String(r.ai_analysis) : undefined,
    createdAt: new Date(String(r.created_at)),
  };
}
