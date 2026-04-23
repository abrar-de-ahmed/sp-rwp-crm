import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAuth();
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
