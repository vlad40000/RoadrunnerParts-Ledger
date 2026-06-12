import { NextResponse } from "next/server";
import { MachineSchema } from "@/src/lib/contracts";
import { lookupBom } from "@/src/sources";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = MachineSchema.safeParse(body?.machine ?? body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid machine." }, { status: 400 });
  }

  try {
    const result = await lookupBom(parsed.data);
    return NextResponse.json({ rows: result.rows, warnings: result.warnings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "BOM lookup failed." }, { status: 500 });
  }
}
