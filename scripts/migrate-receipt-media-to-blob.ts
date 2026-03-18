import fs from "fs/promises";
import path from "path";
import { config as loadEnv } from "dotenv";
import { put } from "@vercel/blob";
import { Client } from "pg";

loadEnv({ path: ".env" });
loadEnv({ path: "../.env", override: false });

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

type ReceiptMediaRow = {
  id: number;
  image_path: string | null;
};

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error("DATABASE_URL is required.");
  }

  return value;
}

function getBlobToken() {
  const value = process.env.BLOB_READ_WRITE_TOKEN;

  if (!value) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to upload receipt media to Vercel Blob.");
  }

  return value;
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function getContentType(filePath: string) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
  const databaseUrl = getDatabaseUrl();
  const token = dryRun ? "dry-run" : getBlobToken();
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();

  try {
    const result = await client.query<ReceiptMediaRow>(`
      select id, image_path
      from receipts
      where coalesce(image_path, '') <> ''
      order by id asc
    `);

    const rows = limit ? result.rows.slice(0, limit) : result.rows;
    const migrated: Array<{ id: number; from: string; to: string }> = [];
    const skipped: Array<{ id: number; reason: string; imagePath: string | null }> = [];

    for (const row of rows) {
      const imagePath = row.image_path;

      if (!imagePath) {
        skipped.push({ id: row.id, reason: "missing image_path", imagePath });
        continue;
      }

      if (isRemoteUrl(imagePath)) {
        skipped.push({ id: row.id, reason: "already remote", imagePath });
        continue;
      }

      const resolvedPath = path.resolve(imagePath);
      const ext = path.extname(resolvedPath).toLowerCase();
      const blobPath = `receipts/${row.id}${ext || ""}`;

      try {
        await fs.access(resolvedPath);
      } catch {
        skipped.push({ id: row.id, reason: "local file not found", imagePath });
        continue;
      }

      if (dryRun) {
        migrated.push({ id: row.id, from: imagePath, to: `blob:${blobPath}` });
        continue;
      }

      const fileBuffer = await fs.readFile(resolvedPath);
      const uploaded = await put(blobPath, fileBuffer, {
        access: "private",
        addRandomSuffix: false,
        contentType: getContentType(resolvedPath),
        token,
      });

      await client.query(`update receipts set image_path = $1, updated_at = now() where id = $2`, [uploaded.url, row.id]);
      migrated.push({ id: row.id, from: imagePath, to: uploaded.url });
      console.log(`Uploaded receipt #${row.id} -> ${uploaded.url}`);
    }

    const report = {
      dryRun,
      processed: rows.length,
      migratedCount: migrated.length,
      skippedCount: skipped.length,
      migrated,
      skipped,
    };

    const reportPath = path.join(process.cwd(), "receipt-media-migration-report.json");
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(JSON.stringify(report, null, 2));
    console.log(`Report written to ${reportPath}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("receipt media migration failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
