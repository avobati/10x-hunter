import { NextResponse } from "next/server";
import { buildStockData } from "@/lib/stock-data";
import { scoreStock, calculateTargets, generateThesis } from "@/lib/scoring-engine";
import { analyzeStockWithAI } from "@/lib/ai-analyst";
import { SCAN_UNIVERSE } from "@/lib/universe";

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();
    if (!ticker) {
      return NextResponse.json({ error: "Ticker required" }, { status: 400 });
    }

    const stockInfo = SCAN_UNIVERSE.find((s) => s.ticker === ticker.toUpperCase()) ?? {
      ticker: ticker.toUpperCase(),
      name: ticker.toUpperCase(),
      sector: "Unknown",
    };

    const data = await buildStockData(stockInfo.ticker, stockInfo.name, stockInfo.sector);
    if (!data) {
      return NextResponse.json({ error: "Could not fetch stock data" }, { status: 404 });
    }

    const scoreBreakdown = scoreStock(data);
    const { targetPrice, stopLoss } = calculateTargets(data, scoreBreakdown.total);
    const thesis = generateThesis(data, scoreBreakdown);
    const aiAnalysis = await analyzeStockWithAI(data);

    return NextResponse.json({
      ticker: stockInfo.ticker,
      name: stockInfo.name,
      price: data.price,
      score: scoreBreakdown,
      targetPrice,
      stopLoss,
      thesis,
      aiAnalysis,
      data: {
        rsi: data.rsi,
        macd: data.macd,
        priceChange1m: data.priceChange1m,
        priceChange3m: data.priceChange3m,
        marketCap: data.marketCap,
        volume: data.volume,
        sma50: data.sma50,
        sma200: data.sma200,
      },
    });
  } catch (error) {
    console.error("POST /api/analyze:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
