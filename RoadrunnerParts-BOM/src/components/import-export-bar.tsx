"use client";

import type { ChangeEvent } from "react";
import type { BomRow, Machine } from "@/src/lib/contracts";
import { dedupeExactBomRows, parseBomCsv, serializeBomCsv } from "@/src/lib/csv";
import { downloadBlob } from "@/src/lib/download";
import { parseBomXlsx, writeBomXlsxArray } from "@/src/lib/xlsx";

type Props = {
  machine: Machine;
  rows: BomRow[];
  onRowsChange: (rows: BomRow[]) => void;
  onLookup: () => Promise<void>;
  busy: boolean;
};

export function ImportExportBar({ machine, rows, onRowsChange, onLookup, busy }: Props) {
  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    onRowsChange(dedupeExactBomRows(parseBomCsv(text)));
  }

  async function importXlsx(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const buffer = await file.arrayBuffer();
    onRowsChange(dedupeExactBomRows(parseBomXlsx(buffer)));
  }

  function exportCsv() {
    downloadBlob(`bom_${machine.machine_id || machine.model || "machine"}.csv`, serializeBomCsv(rows, machine), "text/csv;charset=utf-8");
  }

  function exportXlsx() {
    const data = writeBomXlsxArray(rows, machine);
    downloadBlob(`bom_${machine.machine_id || machine.model || "machine"}.xlsx`, data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onLookup}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Looking up..." : "Lookup BOM"}
        </button>

        <label className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Import CSV
          <input type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />
        </label>

        <label className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Import XLSX
          <input type="file" accept=".xlsx,.xls" onChange={importXlsx} className="hidden" />
        </label>

        <button type="button" onClick={exportCsv} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Export CSV
        </button>
        <button type="button" onClick={exportXlsx} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Export XLSX
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-500">CSV/XLSX imports ignore unsupported columns and keep only part_number, diagram_id, description, encompass_price.</p>
    </section>
  );
}
