import { NextResponse } from "next/server";
import { MachineSchema, BomRowsSchema } from "@/src/lib/contracts";
import { serializeBomCsv } from "@/src/lib/csv";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const machine = MachineSchema.safeParse(body?.machine);
  const rows = BomRowsSchema.safeParse(body?.rows ?? []);

  if (!machine.success || !rows.success) {
    return NextResponse.json({ error: "Invalid export payload." }, { status: 400 });
  }

  return new NextResponse(serializeBomCsv(rows.data, machine.data), {
    headers: {
      "content-type": "text/csv;charset=utf-8",
      "content-disposition": `attachment; filename="bom_${machine.data.machine_id}.csv"`
    }
  });
}
