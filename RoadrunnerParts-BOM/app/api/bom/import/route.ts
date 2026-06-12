import { NextResponse } from "next/server";
import { parseBomCsv } from "@/src/lib/csv";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    const csvText = typeof body?.csv === "string" ? body.csv : "";
    return NextResponse.json({ rows: parseBomCsv(csvText) });
  }

  const text = await request.text();
  return NextResponse.json({ rows: parseBomCsv(text) });
}
