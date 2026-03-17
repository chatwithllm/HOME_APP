import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env" });
loadEnv({ path: "../.env", override: false });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for drizzle.config.ts");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
