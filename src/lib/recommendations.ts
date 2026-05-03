import { getDb } from "./db";
import { Recommendation, PerformanceMetrics } from "@/types";
import { scoreStock, calculateTargets, generateThesis } from "./scoring-engine";
import { buildStockData, fetchQuotes } from "./stock-data";
import { SCAN_UNIVERSE } from "./universe";
import { analyzeStockWithAI } from "./ai-analyst";
import { format, startOfWeek } from "date-fns";

type DbRow = Record<string, unknown>;

// ── Run Weekly Scan ───────────────────────────────────────────────────────────
export async function runWeeklyScan(): Promise<{
  recommendations: Omit<Recommendation, "id" | "createdAt">[];
  stocksScanned: number;
  topPicks: string[];
}> {
  const weekOf = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const scored: Array<{
    ticker: string;
    name: string;
    sector: string;
    score: number;
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
    let risks = ["Market volatility", "Earnings miss", "Sector headwinds"];

    try {
      if (scoreBreakdown.total >= 55) {
        const ai = await analyzeStockWithAI(candidate.data);
        aiAnalysis = JSON.stringify(ai);
        catalysts = ai.catalysts;
        risks = ai.risks;
      }
    } catch {
      // AI analysis is optional
    }

    recommendations.push({
      ticker: candidate.ticker,
      name: candidate.name,
      sector: candidate.sector,
      entryPrice: candidate.data.price,
      targetPrice,
      stopLoss,
      score: scoreBreakdown.total,
      scoreBreakdown,
      thesis,
      catalysts,
      risks,
      timeframe: "3-6 months",
      weekOf,
      status: "active",
      currentPrice: candidate.data.price,
      returnPct: 0,
      aiAnalysis,
    });
  }

  return { recommendations, stocksScanned: scored.length, topPicks: topCandidates.map((c) => c.ticker) };
}

// ── Save Recommendations to DB ────────────────────────────────────────────────
export async function saveRecommendations(recs: Omit<Recommendation, "id" | "createdAt">[]): Promise<void> {
  const db = getDb();

  for (const rec of recs) {
    const stmt = `
      INSERT INTO recommendations (
        ticker, name, sector, entry_price, target_price, stop_loss,
        score, score_breakdown, thesis, catalysts, risks, timeframe,
        week_of, status, current_price, return_pct, ai_analysis
      ) VALUES (
        '${rec.ticker}', '${rec.name.replace(/'/g, "''")}', '${rec.sector}',
        ${rec.entryPrice}, ${rec.targetPrice}, ${rec.stopLoss},
        ${rec.score}, '${JSON.stringify(rec.scoreBreakdown).replace(/'/g, "''")}',
        '${rec.thesis.replace(/'/g, "''")}',
        ARRAY[${rec.catalysts.map((c) => `'${c.replace(/'/g, "''")}'`).join(",")}],
        ARRAY[${rec.risks.map((r) => `'${r.replace(/'/g, "''")}'`).join(",")}],
        '${rec.timeframe}', '${rec.weekOf}', '${rec.status}',
        ${rec.currentPrice ?? rec.entryPrice}, ${rec.returnPct ?? 0},
        ${rec.aiAnalysis ? `'${rec.aiAnalysis.replace(/'/g, "''")}'` : "NULL"}
      ) ON CONFLICT DO NOTHING
    `;
    try {
      await db([stmt] as unknown as TemplateStringsArray);
    } catch (e) {
      console.error("Error saving recommendation:", e);
    }
  }
}

// ── Get All Recommendations ───────────────────────────────────────────────────
export async function getRecommendations(status?: "active" | "closed" | "stopped"): Promise<Recommendation[]> {
  const db = getDb();
  const where = status ? `WHERE status = '${status}'` : "";
  const rows = (await db([`SELECT * FROM recommendations ${where} ORDER BY created_at DESC`] as unknown as TemplateStringsArray)) as unknown as DbRow[];
  return rows.map(mapRow);
}

// ── Update Current Prices ─────────────────────────────────────────────────────
export async function updatePrices(tickers: string[]): Promise<void> {
  const db = getDb();
  const quotes = await fetchQuotes(tickers);

  for (const quote of quotes) {
    const updateStmt = `
      UPDATE recommendations
      SET current_price = ${quote.price},
          return_pct = (${quote.price} - entry_price) / entry_price * 100
      WHERE ticker = '${quote.ticker}' AND status = 'active'
    `;
    try {
      await db([updateStmt] as unknown as TemplateStringsArray);
    } catch {}
  }
}

// ── Calculate Performance Metrics ─────────────────────────────────────────────
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  const db = getDb();

  const allRecs = (await db(["SELECT * FROM recommendations"] as unknown as TemplateStringsArray)) as unknown as DbRow[];
  const active = (await db(["SELECT * FROM recommendations WHERE status = 'active'"] as unknown as TemplateStringsArray)) as unknown as DbRow[];

  const closed = allRecs.filter((r) => r.status === "closed" || r.status === "stopped");
  const returns = closed.map((r) => parseFloat(String(r.return_pct ?? "0")));
  const winners = returns.filter((r) => r > 0);
  const losers = returns.filter((r) => r <= 0);

  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const bestReturn = returns.length > 0 ? Math.max(...returns) : 0;
  const worstReturn = returns.length > 0 ? Math.min(...returns) : 0;

  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((sq, r) => sq + Math.pow(r - avgReturn, 2), 0) / returns.length)
    : 1;
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  const tenXCandidates = allRecs.filter((r) => {
    const tp = parseFloat(String(r.target_price));
    const ep = parseFloat(String(r.entry_price));
    return ep > 0 && tp / ep >= 10;
  }).length;

  return {
    totalRecommendations: allRecs.length,
    activeRecommendations: active.length,
    winners: winners.length,
    losers: losers.length,
    winRate: closed.length > 0 ? (winners.length / closed.length) * 100 : 0,
    avgReturn,
    bestReturn,
    worstReturn,
    avgHoldingDays: 0,
    totalReturnPct: returns.reduce((a, b) => a + b, 0),
    sharpeRatio,
    tenXCandidates,
  };
}

function mapRow(r: DbRow): Recommendation {
  return {
    id: String(r.id),
    ticker: String(r.ticker),
    name: String(r.name),
    sector: String(r.sector ?? ""),
    entryPrice: parseFloat(String(r.entry_price)),
    targetPrice: parseFloat(String(r.target_price)),
    stopLoss: parseFloat(String(r.stop_loss)),
    score: parseFloat(String(r.score)),
    scoreBreakdown: typeof r.score_breakdown === "string"
      ? JSON.parse(r.score_breakdown)
      : (r.score_breakdown as Recommendation["scoreBreakdown"]),
    thesis: String(r.thesis),
    catalysts: Array.isArray(r.catalysts) ? r.catalysts.map(String) : [],
    risks: Array.isArray(r.risks) ? r.risks.map(String) : [],
    timeframe: String(r.timeframe ?? "3-6 months"),
    weekOf: String(r.week_of),
    status: r.status as "active" | "closed" | "stopped",
    currentPrice: r.current_price != null ? parseFloat(String(r.current_price)) : undefined,
    returnPct: r.return_pct != null ? parseFloat(String(r.return_pct)) : undefined,
    closedAt: r.closed_at ? new Date(String(r.closed_at)) : undefined,
    closedPrice: r.closed_price != null ? parseFloat(String(r.closed_price)) : undefined,
    aiAnalysis: r.ai_analysis ? String(r.ai_analysis) : undefined,
    createdAt: new Date(String(r.created_at)),
  };
}
