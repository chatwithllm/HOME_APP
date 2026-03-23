import { eq } from "drizzle-orm";
import { createDb } from "@/db/client";
import { shoppingLists, shoppingSyncEvents } from "@/db/schema";

export async function recordShoppingSyncEvent(args: {
  shoppingListId: number | null;
  target: string;
  eventType: string;
  payloadJson?: Record<string, unknown>;
  resultStatus: "success" | "ignored" | "error";
  resultMessage?: string | null;
}) {
  const { db, pool } = createDb();

  try {
    await db.insert(shoppingSyncEvents).values({
      shoppingListId: args.shoppingListId,
      target: args.target,
      eventType: args.eventType,
      payloadJson: args.payloadJson ?? {},
      resultStatus: args.resultStatus,
      resultMessage: args.resultMessage ?? null,
    });
  } finally {
    await pool.end();
  }
}

export async function getShoppingAutomationSummary() {
  if (!process.env.DATABASE_URL) {
    return {
      openLists: 0,
      syncEvents: 0,
      failedEvents: 0,
      recentEvents: [] as Array<{
        id: number;
        target: string;
        eventType: string;
        resultStatus: string;
        resultMessage: string | null;
        createdAt: Date;
        listName: string | null;
      }>,
    };
  }

  const { db, pool } = createDb();

  try {
    const [lists, events] = await Promise.all([
      db.query.shoppingLists.findMany({
        where: eq(shoppingLists.status, "open"),
      }),
      db.query.shoppingSyncEvents.findMany({
        orderBy: (fields, { desc }) => [desc(fields.createdAt)],
        limit: 8,
      }),
    ]);

    const listNames = new Map(lists.map((list) => [list.id, list.name]));

    return {
      openLists: lists.length,
      syncEvents: events.length,
      failedEvents: events.filter((event) => event.resultStatus === "error").length,
      recentEvents: events.map((event) => ({
        id: event.id,
        target: event.target,
        eventType: event.eventType,
        resultStatus: event.resultStatus,
        resultMessage: event.resultMessage,
        createdAt: event.createdAt,
        listName: event.shoppingListId ? listNames.get(event.shoppingListId) ?? null : null,
      })),
    };
  } finally {
    await pool.end();
  }
}
