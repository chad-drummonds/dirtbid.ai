import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Return a no-op that doesn't crash but logs — useful during development
    // before the database is connected.
    const noop = {
      request: async () => {
        console.warn("DATABASE_URL not set — DB calls are no-ops");
        return [] as Record<string, unknown>[];
      },
    };
    return noop;
  }
  return neon(url);
}

export async function ensureLeadsTable() {
  const db = getDb();
  try {
    await db.request(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        project_type TEXT NOT NULL,
        soil_type TEXT,
        dimensions TEXT,
        estimated_range TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.warn("Failed to ensure leads table:", err);
  }
}
