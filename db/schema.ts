import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const receipts = pgTable(
  "receipts",
  {
    id: serial("id").primaryKey(),
    sourceChannel: text("source_channel"),
    sourceMessageId: text("source_message_id"),
    sourceSender: text("source_sender"),
    imagePath: text("image_path"),
    storeName: text("store_name"),
    receiptDate: timestamp("receipt_date", { mode: "date", withTimezone: false }),
    receiptTime: varchar("receipt_time", { length: 32 }),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }),
    tax: numeric("tax", { precision: 12, scale: 2 }),
    total: numeric("total", { precision: 12, scale: 2 }),
    paymentMethod: text("payment_method"),
    itemCount: integer("item_count"),
    optionsMode: text("options_mode"),
    notes: text("notes"),
    rawText: text("raw_text"),
    structuredJson: jsonb("structured_json").notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_receipts_receipt_date").on(table.receiptDate),
    index("idx_receipts_store_date").on(table.storeName, table.receiptDate),
    index("idx_receipts_created_at").on(table.createdAt),
  ],
);

export const receiptItems = pgTable(
  "receipt_items",
  {
    id: serial("id").primaryKey(),
    receiptId: integer("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number"),
    description: text("description").notNull(),
    quantity: doublePrecision("quantity"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }),
    metaJson: jsonb("meta_json").notNull().default({}),
  },
  (table) => [index("idx_receipt_items_receipt_id").on(table.receiptId, table.lineNumber)],
);

export const storeProfiles = pgTable("store_profiles", {
  storeName: text("store_name").primaryKey(),
  storeType: varchar("store_type", { length: 32 }).notNull().default("other"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

export const shoppingLists = pgTable(
  "shopping_lists",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    storeHint: text("store_hint"),
    budgetExpected: numeric("budget_expected", { precision: 12, scale: 2 }),
    notes: text("notes"),
    sourceChannel: text("source_channel"),
    sourceMessageId: text("source_message_id"),
    plannedFor: timestamp("planned_for", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_shopping_lists_status").on(table.status, table.updatedAt)],
);

export const shoppingPlanItems = pgTable(
  "shopping_plan_items",
  {
    id: serial("id").primaryKey(),
    shoppingListId: integer("shopping_list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    category: text("category"),
    expectedQty: doublePrecision("expected_qty"),
    expectedUnit: varchar("expected_unit", { length: 32 }),
    expectedUnitPrice: numeric("expected_unit_price", { precision: 12, scale: 2 }),
    expectedLineTotal: numeric("expected_line_total", { precision: 12, scale: 2 }),
    preferredStore: text("preferred_store"),
    priority: varchar("priority", { length: 32 }).notNull().default("normal"),
    status: varchar("status", { length: 32 }).notNull().default("planned"),
    notes: text("notes"),
    plannedFor: timestamp("planned_for", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_shopping_plan_items_list_status").on(table.shoppingListId, table.status, table.updatedAt),
    index("idx_shopping_plan_items_normalized_name").on(table.normalizedName),
  ],
);

export const purchaseHistory = pgTable(
  "purchase_history",
  {
    id: serial("id").primaryKey(),
    normalizedName: text("normalized_name").notNull(),
    storeName: text("store_name"),
    receiptId: integer("receipt_id").references(() => receipts.id, { onDelete: "set null" }),
    receiptItemId: integer("receipt_item_id").references(() => receiptItems.id, { onDelete: "set null" }),
    quantity: doublePrecision("quantity"),
    unit: varchar("unit", { length: 32 }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }),
    purchasedAt: timestamp("purchased_at", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => [
    index("idx_purchase_history_name_store_purchased_at").on(
      table.normalizedName,
      table.storeName,
      table.purchasedAt,
    ),
    index("idx_purchase_history_purchased_at").on(table.purchasedAt),
  ],
);

export const shoppingSyncEvents = pgTable(
  "shopping_sync_events",
  {
    id: serial("id").primaryKey(),
    shoppingListId: integer("shopping_list_id").references(() => shoppingLists.id, { onDelete: "cascade" }),
    target: text("target").notNull(),
    eventType: text("event_type").notNull(),
    payloadJson: jsonb("payload_json").notNull().default({}),
    resultStatus: varchar("result_status", { length: 32 }).notNull(),
    resultMessage: text("result_message"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_shopping_sync_events_list").on(table.shoppingListId, table.createdAt)],
);

export const shoppingRecommendationIgnores = pgTable(
  "shopping_recommendation_ignores",
  {
    id: serial("id").primaryKey(),
    normalizedName: text("normalized_name").notNull(),
    itemName: text("item_name"),
    preferredStore: text("preferred_store"),
    reason: text("reason"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ux_shopping_recommendation_ignores_normalized_name").on(table.normalizedName),
    index("idx_shopping_recommendation_ignores_name").on(table.normalizedName),
  ],
);

export const schema = {
  receipts,
  receiptItems,
  storeProfiles,
  shoppingLists,
  shoppingPlanItems,
  purchaseHistory,
  shoppingSyncEvents,
  shoppingRecommendationIgnores,
};

export type AppSchema = typeof schema;
