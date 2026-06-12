import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { MachineSchema } from "@/src/lib/contracts";
import { getDb } from "@/src/server/db";
import { machines } from "@/src/server/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ machine_id: string }> }) {
  const { machine_id } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ machine: null, warning: "DATABASE_URL is not configured." });

  const [machine] = await db.select().from(machines).where(eq(machines.machineId, machine_id));
  return NextResponse.json({ machine: machine ?? null });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ machine_id: string }> }) {
  const { machine_id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = MachineSchema.safeParse({ ...body, machine_id });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid machine." }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ machine: parsed.data, warning: "DATABASE_URL is not configured. Update is client-local only." });

  await db.update(machines).set({
    brand: parsed.data.brand,
    model: parsed.data.model,
    serial: parsed.data.serial,
    notes: parsed.data.notes ?? "",
    updatedAt: new Date()
  }).where(eq(machines.machineId, machine_id));

  const [machine] = await db.select().from(machines).where(eq(machines.machineId, machine_id));
  return NextResponse.json({ machine: machine ?? null });
}
