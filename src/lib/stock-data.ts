import { StockData } from "./scoring-engine";
export { SCAN_UNIVERSE } from "./universe";

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";
const BASE_URL = "https://www.alphavantage.co/query";

// Yahoo Finance-compatible endpoint via public API
const YF_BASE = "https://query1.finance.yahoo.com/v8/finance";
const YF_QUOTE = "https://query1.finance.yahoo.com/v7/finance/quote";

export interface RawQuote {
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap: number;
  pe: number | null;
  week52High: number;
  week52Low: number;
}

// ── Fetch real-time quote from Yahoo Finance ──────────────────────────────────
export async function fetchQuote(ticker: string): Promise<RawQuote | null> {
  try {
    const url = `${YF_QUOTE}?symbols=${ticker}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,marketCap,trailingPE,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketChange`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.quoteResponse?.result?.[0];
    if (!result) return null;

    return {
      ticker,
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePct: result.regularMarketChangePercent ?? 0,
      volume: result.regularMarketVolume ?? 0,
      marketCap: result.marketCap ?? 0,
      pe: result.trailingPE ?? null,
      week52High: result.fiftyTwoWeekHigh ?? 0,
      week52Low: result.fiftyTwoWeekLow ?? 0,
    };
  } catch {
    return null;
  }
}

// ── Fetch multiple quotes ─────────────────────────────────────────────────────
export async function fetchQuotes(tickers: string[]): Promise<RawQuote[]> {
  const chunks = chunkArray(tickers, 10);
  const results: RawQuote[] = [];

  for (const chunk of chunks) {
    try {
      const symbols = chunk.join(",");
      const url = `${YF_QUOTE}?symbols=${symbols}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketVolume,marketCap,trailingPE,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketChange,averageDailyVolume10Day,shortName`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const quoteResults = data?.quoteResponse?.result ?? [];
      for (const r of quoteResults) {
        results.push({
          ticker: r.symbol,
          price: r.regularMarketPrice ?? 0,
          change: r.regularMarketChange ?? 0,
          changePct: r.regularMarketChangePercent ?? 0,
          volume: r.regularMarketVolume ?? 0,
          marketCap: r.marketCap ?? 0,
          pe: r.trailingPE ?? null,
          week52High: r.fiftyTwoWeekHigh ?? 0,
          week52Low: r.fiftyTwoWeekLow ?? 0,
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}

// ── Compute RSI from price history ────────────────────────────────────────────
export function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ── Compute MACD ──────────────────────────────────────────────────────────────
export function computeMACD(closes: number[]): { macd: number; signal: number } {
  const ema = (data: number[], period: number) => {
    const k = 2 / (period + 1);
    let emaVal = data[0];
    for (let i = 1; i < data.length; i++) {
      emaVal = data[i] * k + emaVal * (1 - k);
    }
    return emaVal;
  };

  if (closes.length < 26) return { macd: 0, signal: 0 };
  const ema12 = ema(closes.slice(-12), 12);
  const ema26 = ema(closes.slice(-26), 26);
  const macd = ema12 - ema26;
  const signal = macd * 0.15; // simplified signal
  return { macd, signal };
}

// ── Compute Simple Moving Average ─────────────────────────────────────────────
export function computeSMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// ── Fetch historical data via Alpha Vantage ───────────────────────────────────
export async function fetchHistoricalData(ticker: string): Promise<number[]> {
  try {
    const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) return [];

    return Object.values(timeSeries)
      .slice(0, 200)
      .map((d: unknown) => parseFloat((d as Record<string, string>)["4. close"]))
      .reverse();
  } catch {
    return [];
  }
}


function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Build full StockData from quote + computed indicators ─────────────────────
export async function buildStockData(
  ticker: string,
  name: string,
  sector: string
): Promise<StockData | null> {
  const [quote, history] = await Promise.all([
    fetchQuote(ticker),
    fetchHistoricalData(ticker),
  ]);

  if (!quote) return null;

  const closes = history.length > 0 ? history : [quote.price];

  const rsi = computeRSI(closes);
  const { macd, signal: macdSignal } = computeMACD(closes);
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);

  // Approximate price changes from history
  const priceChange1d = quote.changePct;
  const price1w = closes.length >= 5 ? closes[closes.length - 6] : quote.price;
  const price1m = closes.length >= 21 ? closes[closes.length - 22] : quote.price;
  const price3m = closes.length >= 63 ? closes[closes.length - 64] : quote.price;

  const priceChange1w = price1w > 0 ? ((quote.price - price1w) / price1w) * 100 : 0;
  const priceChange1m = price1m > 0 ? ((quote.price - price1m) / price1m) * 100 : 0;
  const priceChange3m = price3m > 0 ? ((quote.price - price3m) / price3m) * 100 : 0;

  // Approximate avg volume from quote volume (simplified)
  const avgVolume = quote.volume * 0.8;

  return {
    ticker,
    price: quote.price,
    priceChange1d,
    priceChange1w,
    priceChange1m,
    priceChange3m,
    volume: quote.volume,
    avgVolume,
    marketCap: quote.marketCap,
    pe: quote.pe,
    ps: null,
    pb: null,
    revenueGrowth: null,
    grossMargin: null,
    rsi,
    macd,
    macdSignal,
    sma50,
    sma200,
    beta: 1.5,
    shortFloat: null,
    insiderBuying: false,
    institutionalOwnership: null,
    sector,
  };
}
