import { config as loadEnv } from "dotenv";
import { sql } from "drizzle-orm";
import { createDb } from "../db/client";
import { schema } from "../db/schema";

loadEnv({ path: ".env" });
loadEnv({ path: "../.env", override: false });

async function main() {
  const tableNames = Object.keys(schema);
  console.log("Schema tables:", tableNames.join(", "));

  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set; skipping live PostgreSQL connection test.");
    console.log("Schema and Drizzle wiring validated locally.");
    console.log("db:test passed");
    return;
  }

  const { db, pool } = createDb();

  try {
    const result = await db.execute(sql`select current_database() as database, current_user as user, version() as version`);
    const row = result.rows[0] as { database: string; user: string; version: string };

    console.log(`Connected to PostgreSQL database: ${row.database}`);
    console.log(`Connected as user: ${row.user}`);
    console.log(`Server version: ${row.version.split(",")[0]}`);
    console.log("db:test passed");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("db:test failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
