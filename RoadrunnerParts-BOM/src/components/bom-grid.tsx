"use client";

import type { BomRow, Machine } from "@/src/lib/contracts";
import { buildEbayActiveUrl, buildEbaySoldUrl } from "@/src/sources/ebay";

type Props = {
  machine: Machine;
  rows: BomRow[];
  pullIds: Set<number>;
  onRowsChange: (rows: BomRow[]) => void;
  onTogglePull: (index: number) => void;
};

export function BomGrid({ machine, rows, pullIds, onRowsChange, onTogglePull }: Props) {
  function patch(index: number, key: keyof BomRow, value: string) {
    onRowsChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    onRowsChange([...rows, { part_number: "", diagram_id: "", description: "", encompass_price: "" }]);
  }

  function removeRow(index: number) {
    onRowsChange(rows.filter((_, rowIndex) => rowIndex !== index));
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">BOM spreadsheet</h2>
          <p className="text-sm text-slate-500">Data columns are locked to part_number, diagram_id, description, PRICE.</p>
        </div>
        <button type="button" onClick={addRow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Add row
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-40 px-3 py-3 text-left">part_number</th>
              <th className="w-28 px-3 py-3 text-left">diagram_id</th>
              <th className="px-3 py-3 text-left">description</th>
              <th className="w-36 px-3 py-3 text-left">PRICE</th>
              <th className="w-72 px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="px-3 py-2"><Cell value={row.part_number} onChange={(value) => patch(index, "part_number", value)} mono /></td>
                <td className="px-3 py-2"><Cell value={row.diagram_id} onChange={(value) => patch(index, "diagram_id", value)} mono /></td>
                <td className="px-3 py-2"><Cell value={row.description} onChange={(value) => patch(index, "description", value)} /></td>
                <td className="px-3 py-2"><Cell value={row.encompass_price} onChange={(value) => patch(index, "encompass_price", value)} mono /></td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <a
                      href={buildEbayActiveUrl(row, machine)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      eBay Active
                    </a>
                    <a
                      href={buildEbaySoldUrl(row, machine)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      eBay Sold
                    </a>
                    <button
                      type="button"
                      onClick={() => onTogglePull(index)}
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${pullIds.has(index) ? "bg-blue-600 text-white" : "border border-blue-200 text-blue-700 hover:bg-blue-50"}`}
                    >
                      Pull
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  No BOM rows yet. Import a spreadsheet, lookup a BOM, or add a row manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cell({ value, onChange, mono }: { value: string; onChange: (value: string) => void; mono?: boolean }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full rounded-md border border-transparent bg-transparent px-2 py-1 outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white ${mono ? "mono" : ""}`}
    />
  );
}
