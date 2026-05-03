import { neon } from "@neondatabase/serverless";

// Export a single shared sql tagged-template function
let _sql: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

// Run raw SQL string (for DDL / one-off statements)
export async function runRaw(statement: string): Promise<void> {
  const sql = getDb();
  // neon tagged template: sql`...` — for raw strings we use this workaround
  await sql(statement as unknown as TemplateStringsArray & string);
}

export async function initDb(): Promise<void> {
  const { CREATE_TABLES_SQL } = await import("./schema");
  const statements = CREATE_TABLES_SQL
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  for (const stmt of statements) {
    try {
      await runRaw(stmt + ";");
    } catch {
      // Table/index already exists — safe to ignore
    }
  }
}
