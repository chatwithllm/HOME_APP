import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { storeProfiles } from "@/db/schema";
import { serializeStoreProfileNotes } from "@/lib/store-profile";

const storeProfileSchema = z.object({
  storeName: z.string().trim().min(1, "storeName is required"),
  storeType: z.enum(["american", "indian", "other"]),
  notes: z.string().optional(),
  preferredForCategories: z.array(z.string().trim().min(1)).optional(),
  shoppingTips: z.array(z.string().trim().min(1)).optional(),
  pricingNotes: z.string().optional(),
  reliability: z.enum(["high", "medium", "low"]).optional(),
  defaultPriority: z.enum(["high", "normal", "low"]).optional(),
  avoidForItems: z.array(z.string().trim().min(1)).optional(),
  preferForItems: z.array(z.string().trim().min(1)).optional(),
});

export async function POST(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const body = (await request.json()) as unknown;
    const payload = storeProfileSchema.parse(body);

    const connection = createDb();
    pool = connection.pool;

    const serializedNotes = serializeStoreProfileNotes(
      {
        preferredForCategories: payload.preferredForCategories,
        shoppingTips: payload.shoppingTips,
        pricingNotes: payload.pricingNotes,
        reliability: payload.reliability,
        defaultPriority: payload.defaultPriority,
        avoidForItems: payload.avoidForItems,
        preferForItems: payload.preferForItems,
      },
      payload.notes,
    );

    const updated = await connection.db
      .insert(storeProfiles)
      .values({
        storeName: payload.storeName,
        storeType: payload.storeType,
        notes: serializedNotes,
      })
      .onConflictDoUpdate({
        target: storeProfiles.storeName,
        set: {
          storeType: payload.storeType,
          notes: serializedNotes,
          updatedAt: new Date(),
        },
      })
      .returning({
        storeName: storeProfiles.storeName,
        storeType: storeProfiles.storeType,
        notes: storeProfiles.notes,
      });

    return NextResponse.json({ ok: true, store_profile: updated[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid store profile payload",
          issues: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
