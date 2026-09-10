import { getPostgresClient } from "./client";

export interface DatabaseHealthResult {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const start = Date.now();
  try {
    const sql = getPostgresClient();
    await sql`SELECT 1 as health_check`;
    return {
      status: "up",
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Database connection failed",
    };
  }
}
