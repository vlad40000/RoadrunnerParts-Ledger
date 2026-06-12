"use client";

import type { LedgerState } from "@/src/lib/local-ledger";

type Props = {
  ledgers: LedgerState[];
  onSelect: (ledger: LedgerState) => void;
};

export function RecentMachines({ ledgers, onSelect }: Props) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Recent machines</h2>
      <div className="mt-3 space-y-2">
        {ledgers.length ? ledgers.map((ledger) => (
          <button
            key={ledger.machine.machine_id}
            type="button"
            onClick={() => onSelect(ledger)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="mono text-sm font-bold text-slate-900">{ledger.machine.machine_id}</div>
            <div className="mt-1 text-xs text-slate-500">{ledger.machine.brand} · {ledger.machine.model} · {ledger.rows.length} parts</div>
          </button>
        )) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No saved machines yet.</div>
        )}
      </div>
    </aside>
  );
}
