import { NextResponse } from "next/server";
import { SCAN_UNIVERSE, fetchQuotes } from "@/lib/stock-data";

export async function GET() {
  try {
    const tickers = SCAN_UNIVERSE.map((s) => s.ticker);
    const quotes = await fetchQuotes(tickers.slice(0, 20));

    const stocks = quotes.map((q) => {
      const info = SCAN_UNIVERSE.find((s) => s.ticker === q.ticker);
      return {
        ...q,
        name: info?.name ?? q.ticker,
        sector: info?.sector ?? "Unknown",
      };
    });

    return NextResponse.json({ stocks });
  } catch (error) {
    console.error("GET /api/stocks:", error);
    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}
