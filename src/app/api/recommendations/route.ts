import { NextResponse } from "next/server";
import { getRecommendations, saveRecommendations, runWeeklyScan } from "@/lib/recommendations";
import { initDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "active" | "closed" | "stopped" | null;
    const recs = await getRecommendations(status ?? undefined);
    return NextResponse.json({ recommendations: recs });
  } catch (error) {
    console.error("GET /api/recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();

    if (body.action === "scan") {
      const { recommendations, stocksScanned, topPicks } = await runWeeklyScan();
      await saveRecommendations(recommendations);
      return NextResponse.json({ recommendations, stocksScanned, topPicks });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/recommendations:", error);
    return NextResponse.json({ error: "Failed to run scan" }, { status: 500 });
  }
}
