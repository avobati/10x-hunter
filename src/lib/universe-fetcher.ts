/**
 * Fetches all actively listed US tickers from NASDAQ's public FTP directory.
 * These files include ONLY stocks listed on NASDAQ, NYSE, and AMEX —
 * no OTC, pink-sheet, or delisted companies.
 *
 * Sources (public, no API key):
 *   https://ftp.nasdaqtrader.com/SymbolDirectory/nasdaqlisted.txt
 *   https://ftp.nasdaqtrader.com/SymbolDirectory/otherlisted.txt
 *
 * Fallback: SEC EDGAR company_tickers.json (broader but noisier).
 */

export interface TickerRecord {
  ticker: string;
  name: string;
  exchange: string;
}

let _cache: TickerRecord[] | null = null;
let _cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function fetchAllUSTickers(): Promise<TickerRecord[]> {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const tickers: TickerRecord[] = [];

  // ── NASDAQ FTP: nasdaqlisted.txt ──────────────────────────────────────────
  try {
    const res = await fetch(
      "https://ftp.nasdaqtrader.com/SymbolDirectory/nasdaqlisted.txt",
      { signal: AbortSignal.timeout(20_000) }
    );
    if (res.ok) {
      const text = await res.text();
      const lines = text.split("\n").slice(1); // skip header
      for (const line of lines) {
        const parts = line.split("|");
        if (parts.length < 3) continue;
        const ticker = parts[0].trim();
        const name   = parts[1].trim();
        const testIssue = parts[3]?.trim();
        const etf = parts[6]?.trim();
        if (!ticker || ticker === "Symbol") continue;
        if (testIssue === "Y") continue; // skip test issues
        if (etf === "Y") continue;       // skip ETFs — we want individual stocks
        if (!isValidTicker(ticker)) continue;
        tickers.push({ ticker, name, exchange: "NASDAQ" });
      }
    }
  } catch (e) {
    console.warn("[universe] NASDAQ FTP nasdaqlisted failed:", e);
  }

  // ── NASDAQ FTP: otherlisted.txt (NYSE, AMEX, etc.) ───────────────────────
  try {
    const res = await fetch(
      "https://ftp.nasdaqtrader.com/SymbolDirectory/otherlisted.txt",
      { signal: AbortSignal.timeout(20_000) }
    );
    if (res.ok) {
      const text = await res.text();
      const lines = text.split("\n").slice(1); // skip header
      for (const line of lines) {
        const parts = line.split("|");
        if (parts.length < 4) continue;
        const ticker   = parts[0].trim();
        const name     = parts[1].trim();
        const exchange = parts[2].trim();
        const etf      = parts[4]?.trim();
        const testIssue = parts[6]?.trim();
        if (!ticker || ticker === "ACT Symbol") continue;
        if (testIssue === "Y") continue;
        if (etf === "Y") continue;
        if (!isValidTicker(ticker)) continue;
        tickers.push({ ticker, name, exchange: exchange || "NYSE" });
      }
    }
  } catch (e) {
    console.warn("[universe] NASDAQ FTP otherlisted failed:", e);
  }

  if (tickers.length > 500) {
    // Deduplicate by ticker
    const seen = new Set<string>();
    const deduped = tickers.filter((t) => {
      if (seen.has(t.ticker)) return false;
      seen.add(t.ticker);
      return true;
    });
    console.log(`[universe] Loaded ${deduped.length} listed tickers from NASDAQ FTP`);
    _cache = deduped;
    _cacheTime = Date.now();
    return deduped;
  }

  // ── Fallback: SEC EDGAR ──────────────────────────────────────────────────
  try {
    const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
      headers: { "User-Agent": "10xhunter research@10xhunter.app" },
      signal: AbortSignal.timeout(25_000),
    });
    if (res.ok) {
      const json = await res.json() as Record<string, { ticker: string; title: string }>;
      const secTickers = Object.values(json)
        .map((e) => ({
          ticker:   String(e.ticker).toUpperCase().trim(),
          name:     String(e.title).trim(),
          exchange: "SEC",
        }))
        .filter((t) => isValidTicker(t.ticker));
      console.log(`[universe] Loaded ${secTickers.length} tickers from SEC EDGAR fallback`);
      _cache = secTickers;
      _cacheTime = Date.now();
      return secTickers;
    }
  } catch (e) {
    console.warn("[universe] SEC EDGAR fallback failed:", e);
  }

  // ── Last resort: curated universe ────────────────────────────────────────
  const { SCAN_UNIVERSE } = await import("./universe");
  return SCAN_UNIVERSE.map((s) => ({ ticker: s.ticker, name: s.name, exchange: "CURATED" }));
}

function isValidTicker(t: string): boolean {
  // Pure alpha, 1-5 chars, no special classes (warrants, preferred, rights)
  return /^[A-Z]{1,5}$/.test(t);
}
