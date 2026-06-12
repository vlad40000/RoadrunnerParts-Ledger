"use client";

import { useEffect, useMemo, useState } from "react";
import type { BomRow, Machine } from "@/src/lib/contracts";
import { MachineSchema } from "@/src/lib/contracts";
import { BomGrid } from "./bom-grid";
import { ImportExportBar } from "./import-export-bar";
import { MachineIntake } from "./machine-intake";
import { PullList } from "./pull-list";
import { RecentMachines } from "./recent-machines";
import { StatsStrip } from "./stats-strip";
import { listLedgers, saveLedger, type LedgerState } from "@/src/lib/local-ledger";

const EMPTY_MACHINE: Machine = {
  machine_id: "",
  brand: "",
  model: "",
  serial: "",
  notes: ""
};

export function LedgerApp() {
  const [machine, setMachine] = useState<Machine>(EMPTY_MACHINE);
  const [rows, setRows] = useState<BomRow[]>([]);
  const [pullIds, setPullIds] = useState<Set<number>>(new Set());
  const [recent, setRecent] = useState<LedgerState[]>([]);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRecent(listLedgers());
  }, []);

  const machineValid = useMemo(() => MachineSchema.safeParse(machine).success, [machine]);

  function refreshRecent() {
    setRecent(listLedgers());
  }

  function saveCurrent() {
    const parsed = MachineSchema.safeParse(machine);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Machine fields are incomplete.");
      return;
    }
    saveLedger({ machine: parsed.data, rows, updatedAt: new Date().toISOString() });
    refreshRecent();
    setMessage(`Saved ${parsed.data.machine_id}.`);
  }

  function selectLedger(ledger: LedgerState) {
    setMachine(ledger.machine);
    setRows(ledger.rows);
    setPullIds(new Set());
    setMessage(`Loaded ${ledger.machine.machine_id}.`);
  }

  function togglePull(index: number) {
    setPullIds((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function lookupBom() {
    const parsed = MachineSchema.safeParse(machine);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Machine fields are incomplete.");
      return;
    }

    setBusy(true);
    setMessage("Running BOM lookup...");
    try {
      const response = await fetch("/api/bom/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ machine: parsed.data })
      });
      const data = await response.json() as { rows?: BomRow[]; warnings?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Lookup failed.");
      setRows(data.rows ?? []);
      setPullIds(new Set());
      setMessage(data.warnings?.length ? `Lookup complete with warnings: ${data.warnings.join(" ")}` : "Lookup complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Roadrunner Parts Ledger</h1>
            <p className="text-sm text-slate-500">Single-machine BOM spreadsheet. Four BOM fields only.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
            {machineValid ? "machine ready" : "machine incomplete"}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <MachineIntake machine={machine} onChange={setMachine} onSave={saveCurrent} />
          <ImportExportBar machine={machine} rows={rows} onRowsChange={setRows} onLookup={lookupBom} busy={busy} />
          {message ? <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div> : null}
          <StatsStrip rows={rows} />
          <BomGrid machine={machine} rows={rows} pullIds={pullIds} onRowsChange={setRows} onTogglePull={togglePull} />
        </div>
        <div className="space-y-4">
          <RecentMachines ledgers={recent} onSelect={selectLedger} />
          <PullList machine={machine} rows={rows} pullIds={pullIds} onTogglePull={togglePull} />
        </div>
      </div>
    </main>
  );
}
