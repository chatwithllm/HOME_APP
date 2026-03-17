import { NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/db/client";
import { storeProfiles } from "@/db/schema";

const storeProfileSchema = z.object({
  storeName: z.string().trim().min(1, "storeName is required"),
  storeType: z.enum(["american", "indian", "other"]),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  let pool: ReturnType<typeof createDb>["pool"] | undefined;

  try {
    const body = (await request.json()) as unknown;
    const payload = storeProfileSchema.parse(body);

    const connection = createDb();
    pool = connection.pool;

    const updated = await connection.db
      .insert(storeProfiles)
      .values({
        storeName: payload.storeName,
        storeType: payload.storeType,
        notes: payload.notes,
      })
      .onConflictDoUpdate({
        target: storeProfiles.storeName,
        set: {
          storeType: payload.storeType,
          notes: payload.notes,
          updatedAt: new Date(),
        },
      })
      .returning({
        storeName: storeProfiles.storeName,
        storeType: storeProfiles.storeType,
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
