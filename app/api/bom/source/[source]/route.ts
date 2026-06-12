import { NextRequest, NextResponse } from "next/server";
import { MachineSchema } from "@/src/lib/contracts";
import { BUTTON_ADAPTERS } from "@/src/sources/supplier-registry";
import { SUPPLIER_IDS, isSupplierId } from "@/src/sources/supplier-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const RATE_BUCKET = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 5 * 60_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params;

  if (!isSupplierId(source)) {
    return NextResponse.json(
      { error: `Unknown supplier: ${source}`, suppliers: SUPPLIER_IDS },
      { status: 404 }
    );
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const clientAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rate = takeRateSlot(`${source}:${clientAddress}`);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after_seconds: rate.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = MachineSchema.safeParse(body?.machine ?? body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid machine." },
      { status: 400 }
    );
  }

  const result = await BUTTON_ADAPTERS[source].lookupBom(parsed.data);
  return NextResponse.json({
    status: result.rows.length > 0 ? "ok" : (result.warnings[0] ?? "empty"),
    supplier: source,
    ...result
  });
}

function isSameOriginRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function takeRateSlot(key: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = RATE_BUCKET.get(key);

  if (!current || current.resetAt <= now) {
    RATE_BUCKET.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
