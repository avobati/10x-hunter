import { NextResponse } from "next/server";
import { getPerformanceMetrics, updatePrices, getRecommendations } from "@/lib/recommendations";
import { initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const [metrics, active] = await Promise.all([
      getPerformanceMetrics(),
      getRecommendations("active"),
    ]);
    return NextResponse.json({ metrics, activePositions: active });
  } catch (error) {
    console.error("GET /api/tracker:", error);
    return NextResponse.json({ error: "Failed to fetch tracker data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    if (body.action === "update-prices") {
      const active = await getRecommendations("active");
      const tickers = active.map((r) => r.ticker);
      if (tickers.length > 0) {
        await updatePrices(tickers);
      }
      const metrics = await getPerformanceMetrics();
      return NextResponse.json({ success: true, metrics });
    }

    if (body.action === "close") {
      const { id, closedPrice } = body;
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      await db`
        UPDATE recommendations
        SET status = 'closed',
            closed_at = NOW(),
            closed_price = ${closedPrice},
            return_pct = (${closedPrice} - entry_price) / entry_price * 100
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/tracker:", error);
    return NextResponse.json({ error: "Failed to update tracker" }, { status: 500 });
  }
}
