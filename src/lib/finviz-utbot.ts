import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export interface UtbotCandidate {
  ticker: string;
  name: string;
  sector: string;
  score: number;
  quality: string;
  barsSinceBuy: number;
  changePct: number;
  signalPrice: number;
  currentPrice: number;
}

const SOURCE_URL = "https://finviz-utbot.vercel.app/recommendations";

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[$,%]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function headerMap($: cheerio.CheerioAPI, table: AnyNode) {
  const headers: Record<string, number> = {};
  $(table)
    .find("thead tr")
    .last()
    .find("th")
    .each((index, th) => {
      const label = $(th).text().trim().toLowerCase();
      if (label) headers[label] = index;
    });
  return headers;
}

function cell(cells: cheerio.Cheerio<AnyNode>, index: number): string {
  if (index < 0) return "";
  return cells.eq(index).text().trim();
}

export async function fetchUtbotBuyRecommendations(maxRows = 240): Promise<UtbotCandidate[]> {
  try {
    const res = await fetch(SOURCE_URL, {
      next: { revalidate: 60 * 20 },
      headers: { "user-agent": "10x-hunter/1.0" },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const byTicker = new Map<string, UtbotCandidate>();

    $("table").each((_, table) => {
      const headers = headerMap($, table);
      const symbolIdx = headers.symbol;
      const candlesIdx = headers.candles ?? headers["candles ago"];
      if (symbolIdx === undefined || candlesIdx === undefined) return;

      $(table)
        .find("tbody tr")
        .each((__, row) => {
          const cells = $(row).find("td");
          const ticker = cell(cells, symbolIdx).toUpperCase();
          if (!ticker || byTicker.has(ticker)) return;

          const barsSinceBuy = Math.trunc(toNumber(cell(cells, candlesIdx)));
          if (barsSinceBuy < 0 || barsSinceBuy > 4) return;

          const candidate: UtbotCandidate = {
            ticker,
            name: cell(cells, headers.name ?? -1) || ticker,
            sector: cell(cells, headers.market ?? -1) || "Unknown",
            score: toNumber(cell(cells, headers.score ?? -1)),
            quality: cell(cells, headers.quality ?? -1) || "complete",
            barsSinceBuy,
            changePct: toNumber(cell(cells, headers["% change"] ?? -1)),
            signalPrice: toNumber(cell(cells, headers["signal price"] ?? -1)),
            currentPrice: toNumber(cell(cells, headers["current price"] ?? -1)),
          };
          byTicker.set(ticker, candidate);
        });
    });

    return [...byTicker.values()]
      .sort((a, b) => b.score - a.score || a.barsSinceBuy - b.barsSinceBuy)
      .slice(0, maxRows);
  } catch (error) {
    console.error("fetchUtbotBuyRecommendations:", error);
    return [];
  }
}
