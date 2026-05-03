import { neon, NeonQueryFunction } from "@neondatabase/serverless";

type DbClient = NeonQueryFunction<false, false>;

let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _db = neon(process.env.DATABASE_URL) as DbClient;
  }
  return _db;
}

export async function initDb(): Promise<DbClient> {
  const db = getDb();
  const { CREATE_TABLES_SQL } = await import("./schema");
  // Split and run each statement
  const statements = CREATE_TABLES_SQL.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await db([stmt + ";"] as unknown as TemplateStringsArray);
    } catch {
      // ignore if table already exists
    }
  }
  return db;
}
