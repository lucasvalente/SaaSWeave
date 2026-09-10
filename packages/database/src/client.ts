import { getEnv } from "@autuax/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _pgClient: postgres.Sql | null = null;
let _drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPostgresClient(): postgres.Sql {
  if (!_pgClient) {
    const env = getEnv();
    _pgClient = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _pgClient;
}

export function getDb() {
  if (!_drizzleDb) {
    const client = getPostgresClient();
    _drizzleDb = drizzle(client, { schema });
  }
  return _drizzleDb;
}

export async function closePostgresClient(): Promise<void> {
  if (_pgClient) {
    await _pgClient.end({ timeout: 5 });
    _pgClient = null;
    _drizzleDb = null;
  }
}
