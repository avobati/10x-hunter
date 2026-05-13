/**
 * Two-stage batch screener.
 *
 * Stage 1 — takes a list of tickers, fires a TRUE batch quote request via
 *            yahoo-finance2 (one HTTP call per chunk of 100), filters by
 *            price/volume/marketCap thresholds. No individual per-ticker calls.
 *
 * Stage 2 — full 5-factor scoring on the Stage 1 survivors (individual calls,
 *            concurrency=5, hard timeout via Promise.race).
 */

import yahooFinance from "yahoo-finance2";
import { scoreStock, calculateTargets, generateThesis, isBaseEligible } from "./scoring-engine";
import { buildStockData } from "./stock-data";
import { ScoreBreakdown } from "@/types";

const yahoo = new yahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface Stage1Result {
  ticker: string;
  name: string;
  price: number;
  volume: number;
  marketCap: number;
  changePercent: number;
  avgVolume: number;
}

export interface Stage2Result extends Stage1Result {
  sector: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  targetPrice: number;
  stopLoss: number;
  thesis: string;
}

// Stage 1 thresholds — small/mid cap momentum candidates
const MIN_PRICE      = 1.00;
const MAX_PRICE      = 250;
const MIN_VOLUME     = 200_000;
const MIN_MARKET_CAP = 50_000_000;      // $50M
const MAX_MARKET_CAP = 20_000_000_000;  // $20B
const MIN_SCORE_STAGE2 = 52;

type YFQ = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  regularMarketChangePercent?: number;
  averageDailyVolume3Month?: number;
  shortName?: string;
  longName?: string;
};

/**
 * Stage 1: Batch quote via yahoo-finance2 — ONE HTTP call for up to 100 tickers.
 * Uses Promise.race for a hard 8-second wall-clock timeout.
 */
export async function batchQuoteStage1(tickers: string[]): Promise<Stage1Result[]> {
  if (tickers.length === 0) return [];

  const timeoutMs = 8_500; // leave buffer inside Vercel's 10s limit
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs)
  );

  try {
    // yahoo-finance2 accepts a string[] and makes ONE batch request
    const raw = await Promise.race([
      (yahoo.quote as unknown as (s: string[]) => Promise<YFQ | YFQ[]>)(tickers),
      timeoutPromise,
    ]);

    if (!raw) return []; // timed out

    const arr: YFQ[] = Array.isArray(raw) ? raw : [raw];
    const results: Stage1Result[] = [];

    for (const q of arr) {
      if (!q?.regularMarketPrice || q.regularMarketPrice <= 0) continue;
      const price  = q.regularMarketPrice;
      const volume = q.regularMarketVolume ?? 0;
      const mcap   = q.marketCap ?? 0;

      if (price < MIN_PRICE || price > MAX_PRICE) continue;
      if (volume < MIN_VOLUME) continue;
      if (mcap > 0 && mcap < MIN_MARKET_CAP) continue;
      if (mcap > 0 && mcap > MAX_MARKET_CAP) continue;

      results.push({
        ticker:        String(q.symbol ?? "").toUpperCase(),
        name:          q.shortName ?? q.longName ?? String(q.symbol ?? ""),
        price,
        volume,
        marketCap:     mcap,
        changePercent: q.regularMarketChangePercent ?? 0,
        avgVolume:     q.averageDailyVolume3Month ?? volume,
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Stage 2: Full 5-factor scoring. Hard per-ticker timeout via Promise.race.
 */
export async function scoreStage2(stock: Stage1Result): Promise<Stage2Result | null> {
  try {
    const dataPromise = buildStockData(stock.ticker, stock.name, "Unknown");
    const timeout     = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6_000));
    const data = await Promise.race([dataPromise, timeout]);
    if (!data || data.price === 0) return null;
    if (!isBaseEligible(data)) return null;

    const breakdown = scoreStock(data);
    if (breakdown.total < MIN_SCORE_STAGE2) return null;

    const { targetPrice, stopLoss } = calculateTargets(data, breakdown.total);
    const thesis = generateThesis(data, breakdown);

    return {
      ...stock,
      sector: data.sector ?? "Unknown",
      score:  breakdown.total,
      scoreBreakdown: breakdown,
      targetPrice,
      stopLoss,
      thesis,
    };
  } catch {
    return null;
  }
}
