import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@/lib/schema";

neonConfig.webSocketConstructor = ws;

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

const globalForDb = globalThis as typeof globalThis & {
  slacklansPool?: Pool;
};

function getPool(): Pool {
  if (!globalForDb.slacklansPool) {
    globalForDb.slacklansPool = new Pool({
      connectionString: requireDatabaseUrl(),
    });
  }
  return globalForDb.slacklansPool;
}

export function getDb() {
  return drizzle({ client: getPool(), schema });
}
