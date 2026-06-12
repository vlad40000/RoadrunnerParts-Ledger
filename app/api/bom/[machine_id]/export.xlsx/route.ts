import { NextResponse } from "next/server";
import { MachineSchema, BomRowsSchema } from "@/src/lib/contracts";
import { writeBomXlsxArray } from "@/src/lib/xlsx";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const machine = MachineSchema.safeParse(body?.machine);
  const rows = BomRowsSchema.safeParse(body?.rows ?? []);

  if (!machine.success || !rows.success) {
    return NextResponse.json({ error: "Invalid export payload." }, { status: 400 });
  }

  const bytes = writeBomXlsxArray(rows.data, machine.data);
  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="bom_${machine.data.machine_id}.xlsx"`
    }
  });
}
