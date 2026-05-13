import { ScoreBreakdown } from "@/types";

export interface StockData {
  ticker: string;
  price: number;
  priceChange1d: number;
  priceChange1w: number;
  priceChange1m: number;
  priceChange3m?: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  pe: number | null;
  ps: number | null;
  pb: number | null;
  revenueGrowth: number | null;
  earningsGrowth?: number | null;
  grossMargin: number | null;
  rsi: number;
  macd: number;
  macdSignal: number;
  sma50: number;
  sma200: number;
  beta: number;
  shortFloat: number | null;
  insiderBuying?: boolean;
  institutionalOwnership?: number | null;
  sector?: string;
  industry?: string;
  sharesOutstanding?: number | null;
  floatShares?: number | null;
  heldByInsiders?: number | null;
  heldByInstitutions?: number | null;
  operatingCashflow?: number | null;
  freeCashflow?: number | null;
  totalDebt?: number | null;
  profitMargins?: number | null;
  roe?: number | null;
  earningsQuarterlyGrowth?: number | null;
  revenueQuarterlyGrowth?: number | null;
  recommendationMean?: number | null;
  targetMeanPrice?: number | null;
  recentBuySignal?: boolean;
  barsSinceBuy?: number | null;
  signalPrice?: number | null;
  utbotScore?: number | null;
  relativeStrength3m?: number | null;
  relativeStrength6m?: number | null;
  distanceFromHigh?: number | null;
  industryLeadership?: number | null;
  marketRegime?: "bull" | "neutral" | "bear";
}

/**
 * Hedge Fund Quality Scoring Model — inspired by:
 * - O'Neil's CAN SLIM methodology
 * - Driehaus momentum approach
 * - Peter Lynch growth fundamentals
 * - Stan Weinstein stage analysis
 */
export function scoreStock(data: StockData): ScoreBreakdown {
  const momentum = scoreMomentum(data);
  const fundamental = scoreFundamental(data);
  const technical = scoreTechnical(data);
  const catalyst = scoreCatalyst(data);
  const riskReward = scoreRiskReward(data);

  const baseEligible = isBaseEligible(data);
  const regimeMultiplier = data.marketRegime === "bull" ? 1.04 : data.marketRegime === "bear" ? 0.88 : 0.97;
  const tenXAdjustment = scoreTenXAdjustment(data);
  const rawTotal = momentum + fundamental + technical + catalyst + riskReward;
  const gatedTotal = baseEligible ? rawTotal * regimeMultiplier + tenXAdjustment : Math.min(rawTotal, 49);
  const total = Math.min(100, Math.max(0, gatedTotal));

  return {
    momentum,
    fundamental,
    technical,
    catalyst,
    riskReward,
    total,
    regime: data.marketRegime ?? "neutral",
    baseEligible,
    barsSinceBuy: data.barsSinceBuy ?? null,
    relativeStrength: Math.round(computeRelativeStrength(data)),
    acceleration: Math.round(computeAcceleration(data)),
    industryLeadership: Math.round(data.industryLeadership ?? sectorLeadershipScore(data.sector)),
    smartMoney: Math.round(computeSmartMoney(data)),
  };
}

export function isBaseEligible(data: StockData): boolean {
  const recentBuy = data.recentBuySignal !== false && (data.barsSinceBuy == null || data.barsSinceBuy <= 4);
  return recentBuy && data.price > 0 && data.sma200 > 0 && data.price > data.sma200;
}

// ── Momentum Score (0-25) ─────────────────────────────────────────────────────
// Strong price + volume momentum is the #1 predictor of 10x candidates
function scoreMomentum(data: StockData): number {
  let score = 0;

  const { priceChange1d, priceChange1w, priceChange1m, priceChange3m } = data;
  const volumeRatio = data.avgVolume > 0 ? data.volume / data.avgVolume : 1;
  const oneilPower = Math.max(0, priceChange1d) * Math.min(5, volumeRatio);

  if (oneilPower >= 25) score += 7;
  else if (oneilPower >= 12) score += 5;
  else if (oneilPower >= 6) score += 3;

  if (priceChange1w >= 15) score += 4;
  else if (priceChange1w >= 8) score += 3;
  else if (priceChange1w >= 3) score += 2;
  else if (priceChange1w >= 0) score += 1;

  if (priceChange1m >= 40) score += 4;
  else if (priceChange1m >= 25) score += 3;
  else if (priceChange1m >= 12) score += 2;
  else if (priceChange1m >= 0) score += 1;

  if ((priceChange3m ?? 0) >= 80) score += 4;
  else if ((priceChange3m ?? 0) >= 45) score += 3;
  else if ((priceChange3m ?? 0) >= 20) score += 2;

  if (volumeRatio >= 4) score += 4;
  else if (volumeRatio >= 2.5) score += 3;
  else if (volumeRatio >= 1.5) score += 2;
  else if (volumeRatio >= 1.1) score += 1;

  score += Math.round(computeRelativeStrength(data) / 100 * 3);
  if (data.barsSinceBuy === 0) score += 3;
  else if (data.barsSinceBuy !== null && data.barsSinceBuy !== undefined && data.barsSinceBuy <= 2) score += 2;
  else if (data.barsSinceBuy !== null && data.barsSinceBuy !== undefined && data.barsSinceBuy <= 4) score += 1;

  return Math.min(25, score);
}

// ── Fundamental Score (0-25) ──────────────────────────────────────────────────
// Growth at reasonable price (GARP) + disruptive business model signals
function scoreFundamental(data: StockData): number {
  let score = 0;

  // Revenue growth (0-12) — the lifeblood of a 10x
  const revGrowth = data.revenueGrowth ?? data.revenueQuarterlyGrowth ?? null;
  if (revGrowth !== null && revGrowth !== undefined) {
    if (revGrowth >= 100) score += 12;
    else if (revGrowth >= 75) score += 10;
    else if (revGrowth >= 50) score += 8;
    else if (revGrowth >= 30) score += 6;
    else if (revGrowth >= 20) score += 4;
    else if (revGrowth >= 10) score += 2;
  }

  // Gross margin quality (0-7) — high margins = pricing power
  const margin = data.grossMargin;
  if (margin !== null && margin !== undefined) {
    if (margin >= 70) score += 7;
    else if (margin >= 50) score += 5;
    else if (margin >= 40) score += 4;
    else if (margin >= 30) score += 3;
    else if (margin >= 20) score += 2;
    else if (margin >= 0) score += 1;
  }

  // Valuation (0-6) — cheap beats expensive but growth wins
  const ps = data.ps;
  const pe = data.pe;
  if (ps !== null && ps !== undefined) {
    // Low P/S with high growth = massive upside
    if (ps < 1 && (revGrowth ?? 0) > 20) score += 6;
    else if (ps < 3 && (revGrowth ?? 0) > 20) score += 4;
    else if (ps < 5) score += 3;
    else if (ps < 10) score += 2;
    else if (ps < 20) score += 1;
  } else if (pe !== null && pe !== undefined && pe > 0) {
    if (pe < 15) score += 4;
    else if (pe < 25) score += 3;
    else if (pe < 40) score += 2;
    else if (pe < 60) score += 1;
  }

  // Small/micro cap premium (bonus for undiscovered gems)
  const mcap = data.marketCap;
  if (mcap > 100_000_000 && mcap < 2_000_000_000) score += 3;
  else if (mcap < 10_000_000_000) score += 2;
  else if (mcap < 50_000_000_000) score += 1;

  if (computeAcceleration(data) >= 70) score += 2;

  return Math.min(25, score);
}

// ── Technical Score (0-20) ────────────────────────────────────────────────────
// Stage 2 uptrend confirmation using Weinstein + O'Neil criteria
function scoreTechnical(data: StockData): number {
  let score = 0;

  // RSI (0-6): Ideal range 55-80 for momentum stocks
  const { rsi } = data;
  if (rsi >= 60 && rsi <= 80) score += 6;
  else if (rsi >= 55 && rsi < 60) score += 4;
  else if (rsi >= 50 && rsi < 55) score += 3;
  else if (rsi > 80) score += 2; // overbought but trending
  else if (rsi >= 40 && rsi < 50) score += 1;

  // MACD (0-5): Bullish cross or expanding histogram
  const macdDiff = data.macd - data.macdSignal;
  if (macdDiff > 0) {
    if (macdDiff > 0.5) score += 5;
    else if (macdDiff > 0.2) score += 4;
    else score += 3;
  } else if (macdDiff > -0.1) {
    score += 1; // just crossed — anticipatory signal
  }

  // Moving average position (0-9)
  const { price, sma50, sma200 } = data;
  if (sma50 > 0 && sma200 > 0) {
    // Golden cross: SMA50 > SMA200
    if (sma50 > sma200) score += 3;
    // Price above both MAs (Stage 2)
    if (price > sma50) score += 3;
    if (price > sma200) score += 3;
  }

  if (data.recentBuySignal && (data.barsSinceBuy ?? 99) <= 4) score += 3;
  if (isBaseEligible(data)) score += 2;

  return Math.min(20, score);
}

// ── Catalyst Score (0-20) ─────────────────────────────────────────────────────
// Upcoming events that could ignite a 10x move
function scoreCatalyst(data: StockData): number {
  let score = 0;

  // Short squeeze potential (0-8)
  const sf = data.shortFloat;
  if (sf !== null && sf !== undefined) {
    if (sf >= 30) score += 8;       // extreme short interest = potential rocket
    else if (sf >= 20) score += 6;
    else if (sf >= 15) score += 4;
    else if (sf >= 10) score += 2;
  }

  // Insider buying signal (0-7)
  if (data.insiderBuying) score += 7;

  // Institutional ownership sweet spot (0-5)
  const instOwn = data.institutionalOwnership;
  if (instOwn !== null && instOwn !== undefined) {
    // Low institutional = undiscovered gem. High = fully discovered.
    if (instOwn < 20) score += 5;       // undiscovered
    else if (instOwn < 40) score += 4;  // early institutional entry
    else if (instOwn < 60) score += 3;  // building awareness
    else if (instOwn < 80) score += 1;  // mainstream
  }

  // High beta in bull market
  if (data.beta > 1.5) score += 3;
  else if (data.beta > 1.2) score += 2;
  else if (data.beta > 1.0) score += 1;

  score += Math.round(computeSmartMoney(data) / 100 * 4);
  score += Math.round((data.industryLeadership ?? sectorLeadershipScore(data.sector)) / 100 * 3);

  return Math.min(20, score);
}

// ── Risk/Reward Score (0-10) ──────────────────────────────────────────────────
function scoreRiskReward(data: StockData): number {
  let score = 5; // baseline

  if (data.beta > 3 && data.priceChange1m < 0) score -= 3;
  if (data.beta > 2.8) score -= 1;

  if (data.rsi > 85 && (data.revenueGrowth ?? 0) < 20) score -= 2;
  if ((data.distanceFromHigh ?? 20) < 3 && data.rsi > 78) score -= 1;

  if (data.beta >= 1.2 && data.beta <= 2.5) score += 2;
  if (data.rsi >= 55 && data.rsi <= 75) score += 2;
  if ((data.priceChange1m ?? 0) > 20 && data.rsi < 80) score += 3;
  if (data.price > data.sma200 && data.sma50 > data.sma200) score += 1;
  if ((data.freeCashflow ?? 0) > 0 || (data.operatingCashflow ?? 0) > 0) score += 1;

  return Math.min(10, Math.max(0, score));
}

function computeRelativeStrength(data: StockData): number {
  const provided = data.relativeStrength3m ?? data.relativeStrength6m;
  if (provided != null) return clamp(provided);
  return clamp(50 + (data.priceChange3m ?? 0) * 0.45 + data.priceChange1m * 0.3);
}

function computeAcceleration(data: StockData): number {
  const revenue = data.revenueGrowth ?? data.revenueQuarterlyGrowth ?? 0;
  const earnings = data.earningsGrowth ?? data.earningsQuarterlyGrowth ?? 0;
  const margin = data.grossMargin ?? 0;
  const cash = (data.freeCashflow ?? data.operatingCashflow ?? 0) > 0 ? 8 : 0;
  return clamp(45 + revenue * 0.35 + earnings * 0.2 + Math.max(0, margin - 25) * 0.25 + cash);
}

function computeSmartMoney(data: StockData): number {
  const inst = data.institutionalOwnership ?? data.heldByInstitutions ?? 35;
  const insider = data.heldByInsiders ?? 0;
  const short = data.shortFloat ?? 0;
  const volumeRatio = data.avgVolume > 0 ? data.volume / data.avgVolume : 1;
  return clamp(35 + sweetSpot(inst, 18, 65) * 0.28 + insider * 0.18 + Math.min(30, short) * 0.45 + Math.min(30, volumeRatio * 8));
}

function scoreTenXAdjustment(data: StockData): number {
  const leadership = data.industryLeadership ?? sectorLeadershipScore(data.sector);
  const acceleration = computeAcceleration(data);
  const smartMoney = computeSmartMoney(data);
  let adjustment = 0;
  if (computeRelativeStrength(data) >= 70 && leadership >= 65) adjustment += 3;
  if (acceleration >= 75 && smartMoney >= 60) adjustment += 3;
  if (data.price > data.sma200 && data.sma50 > data.sma200 && data.recentBuySignal) adjustment += 2;
  if ((data.totalDebt ?? 0) > 0 && (data.operatingCashflow ?? 0) < 0) adjustment -= 2;
  if ((data.marketCap ?? 0) < 100_000_000) adjustment -= 3;
  return adjustment;
}

function sectorLeadershipScore(sector?: string): number {
  const s = (sector ?? "").toLowerCase();
  if (s.includes("technology") || s.includes("semiconductor")) return 78;
  if (s.includes("communication")) return 70;
  if (s.includes("healthcare")) return 66;
  if (s.includes("industrial")) return 64;
  if (s.includes("financial")) return 58;
  if (s.includes("energy") || s.includes("material")) return 55;
  return 50;
}

function sweetSpot(value: number, low: number, high: number): number {
  if (value >= low && value <= high) return 100;
  return value < low ? clamp((value / low) * 100) : clamp(100 - (value - high) * 1.4);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

// ── Target Price Calculator ───────────────────────────────────────────────────
export function calculateTargets(data: StockData, score: number) {
  const { price } = data;

  // Target multiplier based on score and market cap
  let targetMultiplier = 1.5;
  if (score >= 85) targetMultiplier = 3.0;
  else if (score >= 75) targetMultiplier = 2.5;
  else if (score >= 65) targetMultiplier = 2.0;
  else if (score >= 55) targetMultiplier = 1.75;

  // Small caps get higher targets (more room to run)
  if (data.marketCap < 300_000_000) targetMultiplier *= 1.3;
  else if (data.marketCap < 2_000_000_000) targetMultiplier *= 1.1;

  const targetPrice = price * targetMultiplier;

  // Stop loss: 15-25% below entry depending on volatility
  const stopPct = data.beta > 2 ? 0.25 : data.beta > 1.5 ? 0.20 : 0.15;
  const stopLoss = price * (1 - stopPct);

  return { targetPrice, stopLoss };
}

// ── Hedge Fund Thesis Generator ───────────────────────────────────────────────
export function generateThesis(data: StockData, breakdown: ScoreBreakdown): string {
  const parts: string[] = [];

  // Momentum narrative
  if (breakdown.momentum >= 18) {
    parts.push(`${data.ticker} is exhibiting exceptional price and volume momentum with ${data.priceChange1m?.toFixed(0)}% gains over the past month on ${(data.volume / data.avgVolume).toFixed(1)}x average volume, signaling institutional accumulation.`);
  } else if (breakdown.momentum >= 12) {
    parts.push(`${data.ticker} shows strong momentum with consistent buying pressure and above-average volume.`);
  }

  // Fundamental narrative
  if (breakdown.fundamental >= 18) {
    parts.push(`The business demonstrates exceptional growth fundamentals with ${data.revenueGrowth?.toFixed(0)}% revenue growth and ${data.grossMargin?.toFixed(0)}% gross margins, characteristic of early-stage disruptors before institutional discovery.`);
  } else if (breakdown.fundamental >= 10) {
    parts.push(`Solid fundamentals with above-average growth trajectory and healthy margins suggest undervaluation relative to peers.`);
  }

  // Technical narrative
  if (breakdown.technical >= 15) {
    parts.push(`Technical structure is ideal: price in Stage 2 uptrend above both 50-day and 200-day moving averages with bullish MACD and RSI at ${data.rsi?.toFixed(0)} — momentum without being overbought.`);
  }

  // Catalyst narrative
  if ((data.shortFloat ?? 0) >= 20) {
    parts.push(`High short interest of ${data.shortFloat?.toFixed(0)}% creates significant short squeeze potential that could accelerate gains.`);
  }
  if (data.insiderBuying) {
    parts.push(`Recent insider buying signals management confidence in upcoming catalysts.`);
  }

  return parts.join(" ") || `${data.ticker} presents a compelling risk/reward setup based on our multi-factor scoring model.`;
}
