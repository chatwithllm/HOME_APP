import { NextResponse } from "next/server";
import { getShoppingAutomationSummary } from "@/lib/shopping-automation";

export async function GET() {
  try {
    const summary = await getShoppingAutomationSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
