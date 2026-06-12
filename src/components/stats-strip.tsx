import type { BomRow } from "@/src/lib/contracts";
import { formatMoney, sumPrices } from "@/src/lib/price";

type Props = { rows: BomRow[] };

export function StatsStrip({ rows }: Props) {
  const blank = rows.filter((row) => !row.encompass_price.trim()).length;
  const nla = rows.filter((row) => row.encompass_price.trim().toUpperCase() === "NLA").length;
  const total = sumPrices(rows.map((row) => row.encompass_price));

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Stat label="Parts count" value={String(rows.length)} />
      <Stat label="Catalog value" value={formatMoney(total)} green />
      <Stat label="Blank price count" value={String(blank)} />
      <Stat label="NLA count" value={String(nla)} amber />
    </div>
  );
}

function Stat({ label, value, green, amber }: { label: string; value: string; green?: boolean; amber?: boolean }) {
  const valueClass = green ? "text-emerald-700" : amber ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mono mt-1 text-xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}
