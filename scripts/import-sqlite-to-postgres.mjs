import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { Client } from "pg";

const root = process.cwd();
const envPath = path.join(root, ".env");
const sqlitePath = path.join(root, "service_status.db");

function readDatabaseUrl() {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed.slice("DATABASE_URL=".length).trim().replace(/^['\"]|['\"]$/g, "");
    }
  }
  throw new Error("DATABASE_URL not found in .env");
}

function sqliteJson(query) {
  const output = execFileSync("sqlite3", ["-json", sqlitePath, query], { encoding: "utf8" });
  return output.trim() ? JSON.parse(output) : [];
}

function parseJsonMaybe(value, fallback = {}) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeTimestamp(value) {
  return value == null || value === "" ? null : value;
}

function normalizeDate(value) {
  return value == null || value === "" ? null : value;
}

async function insertRows(client, table, rows) {
  if (!rows.length) return;
  for (const row of rows) {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const update = columns
      .filter((c) => c !== "id")
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");

    const sql = `insert into ${table} (${columns.join(", ")}) values (${placeholders}) on conflict (id) do update set ${update}`;
    await client.query(sql, values);
  }
}

async function insertStoreProfiles(client, rows) {
  if (!rows.length) return;
  for (const row of rows) {
    await client.query(
      `insert into store_profiles (store_name, store_type, notes, updated_at)
       values ($1, $2, $3, $4)
       on conflict (store_name) do update set
         store_type = excluded.store_type,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      [row.store_name, row.store_type, row.notes, row.updated_at],
    );
  }
}

async function resetSequence(client, table, idColumn = "id") {
  await client.query(
    `select setval(pg_get_serial_sequence($1, $2), coalesce((select max(${idColumn}) from ${table}), 0) + 1, false)`,
    [table, idColumn],
  );
}

async function main() {
  const databaseUrl = readDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const receipts = sqliteJson("select * from receipts order by id").map((row) => ({
    id: row.id,
    source_channel: row.source_channel,
    source_message_id: row.source_message_id,
    source_sender: row.source_sender,
    image_path: row.image_path,
    store_name: row.store_name,
    receipt_date: normalizeDate(row.receipt_date),
    receipt_time: row.receipt_time,
    currency: row.currency || "USD",
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    payment_method: row.payment_method,
    item_count: row.item_count,
    options_mode: row.options_mode,
    notes: row.notes,
    raw_text: row.raw_text,
    structured_json: parseJsonMaybe(row.structured_json, {}),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  }));

  const receiptItems = sqliteJson("select * from receipt_items order by id").map((row) => ({
    id: row.id,
    receipt_id: row.receipt_id,
    line_number: row.line_number,
    description: row.description,
    quantity: row.quantity,
    unit_price: row.unit_price,
    line_total: row.line_total,
    meta_json: parseJsonMaybe(row.meta_json, {}),
  }));

  const storeProfiles = sqliteJson("select * from store_profiles order by store_name").map((row) => ({
    store_name: row.store_name,
    store_type: row.store_type || "other",
    notes: row.notes,
    updated_at: normalizeTimestamp(row.updated_at),
  }));

  const shoppingLists = sqliteJson("select * from shopping_lists order by id").map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    store_hint: row.store_hint,
    budget_expected: row.budget_expected,
    notes: row.notes,
    source_channel: row.source_channel,
    source_message_id: row.source_message_id,
    planned_for: normalizeTimestamp(row.planned_for),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  }));

  const shoppingPlanItems = sqliteJson("select * from shopping_plan_items order by id").map((row) => ({
    id: row.id,
    shopping_list_id: row.shopping_list_id,
    item_name: row.item_name,
    normalized_name: row.normalized_name,
    category: row.category,
    expected_qty: row.expected_qty,
    expected_unit: row.expected_unit,
    expected_unit_price: row.expected_unit_price,
    expected_line_total: row.expected_line_total,
    preferred_store: row.preferred_store,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    planned_for: normalizeTimestamp(row.planned_for),
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  }));

  const shoppingRecommendationIgnores = sqliteJson("select * from shopping_recommendation_ignores order by id").map((row) => ({
    id: row.id,
    normalized_name: row.normalized_name,
    item_name: row.item_name,
    preferred_store: row.preferred_store,
    reason: row.reason,
    active: true,
    created_at: normalizeTimestamp(row.created_at),
    updated_at: normalizeTimestamp(row.updated_at),
  }));

  const shoppingSyncEvents = sqliteJson("select * from shopping_sync_events order by id").map((row) => ({
    id: row.id,
    shopping_list_id: row.shopping_list_id,
    target: row.target,
    event_type: row.event_type,
    payload_json: parseJsonMaybe(row.payload_json, {}),
    result_status: row.result_status,
    result_message: row.result_message,
    created_at: normalizeTimestamp(row.created_at),
  }));

  const purchaseHistory = sqliteJson("select * from purchase_history order by id").map((row) => ({
    id: row.id,
    normalized_name: row.normalized_name,
    store_name: row.store_name,
    receipt_id: row.receipt_id,
    receipt_item_id: row.receipt_item_id,
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unit_price,
    line_total: row.line_total,
    purchased_at: normalizeTimestamp(row.purchased_at),
  }));

  try {
    await client.query("begin");
    await client.query(`truncate table
      shopping_sync_events,
      shopping_plan_items,
      shopping_lists,
      shopping_recommendation_ignores,
      purchase_history,
      receipt_items,
      store_profiles,
      receipts
      restart identity cascade`);

    await insertRows(client, "receipts", receipts);
    await insertRows(client, "receipt_items", receiptItems);
    await insertStoreProfiles(client, storeProfiles);
    await insertRows(client, "shopping_lists", shoppingLists);
    await insertRows(client, "shopping_plan_items", shoppingPlanItems);
    await insertRows(client, "shopping_recommendation_ignores", shoppingRecommendationIgnores);
    await insertRows(client, "shopping_sync_events", shoppingSyncEvents);
    await insertRows(client, "purchase_history", purchaseHistory);

    for (const table of [
      "receipts",
      "receipt_items",
      "shopping_lists",
      "shopping_plan_items",
      "shopping_recommendation_ignores",
      "shopping_sync_events",
      "purchase_history",
    ]) {
      await resetSequence(client, table);
    }

    await client.query("commit");
    console.log(
      JSON.stringify(
        {
          receipts: receipts.length,
          receipt_items: receiptItems.length,
          store_profiles: storeProfiles.length,
          shopping_lists: shoppingLists.length,
          shopping_plan_items: shoppingPlanItems.length,
          shopping_recommendation_ignores: shoppingRecommendationIgnores.length,
          shopping_sync_events: shoppingSyncEvents.length,
          purchase_history: purchaseHistory.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
