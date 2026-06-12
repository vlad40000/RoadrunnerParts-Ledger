import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { MachineSchema } from "@/src/lib/contracts";
import { getDb } from "@/src/server/db";
import { machines } from "@/src/server/db/schema";

export async function GET() {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ machines: [], warning: "DATABASE_URL is not configured. Client UI uses local storage." });
  }

  const data = await db.select().from(machines).limit(50);
  return NextResponse.json({ machines: data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = MachineSchema.safeParse(body?.machine ?? body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid machine." }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ machine: parsed.data, warning: "DATABASE_URL is not configured. Save is client-local only." });
  }

  await db.insert(machines).values({
    machineId: parsed.data.machine_id,
    brand: parsed.data.brand,
    model: parsed.data.model,
    serial: parsed.data.serial,
    notes: parsed.data.notes ?? ""
  }).onConflictDoUpdate({
    target: machines.machineId,
    set: {
      brand: parsed.data.brand,
      model: parsed.data.model,
      serial: parsed.data.serial,
      notes: parsed.data.notes ?? "",
      updatedAt: new Date()
    }
  });

  const [machine] = await db.select().from(machines).where(eq(machines.machineId, parsed.data.machine_id));
  return NextResponse.json({ machine });
}
