"use client";

import type { BomRow, Machine } from "@/src/lib/contracts";
import { serializeBomCsv } from "@/src/lib/csv";
import { downloadBlob } from "@/src/lib/download";
import { formatMoney, sumPrices } from "@/src/lib/price";
import { writeBomXlsxArray } from "@/src/lib/xlsx";

type Props = {
  machine: Machine;
  rows: BomRow[];
  pullIds: Set<number>;
  onTogglePull: (index: number) => void;
};

export function PullList({ machine, rows, pullIds, onTogglePull }: Props) {
  const pulled = [...pullIds].sort((a, b) => a - b).flatMap((index) => rows[index] ? [{ row: rows[index], index }] : []);
  const total = sumPrices(pulled.map((item) => item.row.encompass_price));

  function exportCsv() {
    downloadBlob(`pull_${machine.machine_id || "machine"}.csv`, serializeBomCsv(pulled.map((item) => item.row), machine), "text/csv;charset=utf-8");
  }

  function exportXlsx() {
    const data = writeBomXlsxArray(pulled.map((item) => item.row), machine);
    downloadBlob(`pull_${machine.machine_id || "machine"}.xlsx`, data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Pull list</h2>
          <p className="text-sm text-slate-500">Exports use the same four BOM columns.</p>
        </div>
        <div className="text-right">
          <div className="mono text-xl font-bold text-emerald-700">{formatMoney(total)}</div>
          <div className="text-xs text-slate-500">{pulled.length} staged</div>
        </div>
      </div>

      <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
        {pulled.length ? pulled.map(({ row, index }) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="mono text-sm font-bold text-slate-900">{row.part_number || "[blank part]"}</div>
                <div className="mt-1 text-xs text-slate-500">Diagram {row.diagram_id || "—"}</div>
              </div>
              <button type="button" onClick={() => onTogglePull(index)} className="text-xs font-semibold text-red-600 hover:text-red-700">remove</button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{row.description}</p>
            <div className="mono mt-2 text-sm font-semibold text-slate-900">{row.encompass_price || ""}</div>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">No parts staged.</div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={exportCsv} disabled={!pulled.length} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Export CSV</button>
        <button type="button" onClick={exportXlsx} disabled={!pulled.length} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Export XLSX</button>
      </div>
    </aside>
  );
}
