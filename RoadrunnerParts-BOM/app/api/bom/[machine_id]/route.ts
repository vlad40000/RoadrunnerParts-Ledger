import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ machine_id: string }> }) {
  const { machine_id } = await params;
  return NextResponse.json({ machine_id, rows: [], warning: "Server persistence requires DATABASE_URL. Client UI uses local storage by default." });
}

export async function PUT(request: Request, { params }: { params: Promise<{ machine_id: string }> }) {
  const { machine_id } = await params;
  const body = await request.json().catch(() => null);
  return NextResponse.json({ machine_id, rows: body?.rows ?? [], warning: "Server persistence route is intentionally thin until Neon is configured." });
}
