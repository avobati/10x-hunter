import { NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";
import { format, startOfWeek } from "date-fns";

export async function GET() {
  try {
    await initDb();
    const db = getDb();
    const scans = await db`SELECT * FROM weekly_scans ORDER BY scan_date DESC LIMIT 20`;
    return NextResponse.json({ scans });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
