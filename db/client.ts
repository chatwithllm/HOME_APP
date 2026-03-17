import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "./schema";

export function assertDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to your environment before running database commands.");
  }

  return connectionString;
}

export function createPool() {
  return new Pool({
    connectionString: assertDatabaseUrl(),
    ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false },
  });
}

export function createDb() {
  const pool = createPool();
  const db = drizzle(pool, { schema });

  return { db, pool };
}
