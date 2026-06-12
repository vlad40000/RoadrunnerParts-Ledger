"use client";

import { useCallback, useMemo, useState } from "react";
import type { BomRow, Machine } from "@/src/lib/contracts";
import { SUPPLIER_IDS, SUPPLIER_LABELS, type SupplierId } from "@/src/sources/supplier-config";
import type { LookupResult } from "@/src/sources/types";

export type ApplyMode = "replace" | "merge";

type SupplierResult = LookupResult & {
  status: string;
  supplier: SupplierId;
};

type CardState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "result"; result: SupplierResult }
  | { kind: "error"; message: string };

export function BomSourceCards({
  machine,
  currentLedger,
  onApply
}: {
  machine: Machine;
  currentLedger: BomRow[];
  onApply: (supplier: SupplierId, rows: BomRow[], mode: ApplyMode) => Promise<void>;
}) {
  const [cards, setCards] = useState<Record<SupplierId, CardState>>(() =>
    Object.fromEntries(SUPPLIER_IDS.map((supplier) => [supplier, { kind: "idle" }])) as Record<SupplierId, CardState>
  );

  const ready = Boolean(machine.machine_id && machine.brand && machine.model && machine.serial);

  const runSupplier = useCallback(async (supplier: SupplierId) => {
    setCards((current) => ({ ...current, [supplier]: { kind: "running" } }));

    try {
      const response = await fetch(`/api/bom/source/${supplier}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(machine)
      });
      const data = await response.json().catch(() => null) as SupplierResult | { error?: string } | null;

      if (!response.ok || !data || !("rows" in data)) {
        const message = data && "error" in data && data.error
          ? data.error
          : `Supplier request failed with HTTP ${response.status}.`;
        throw new Error(message);
      }

      setCards((current) => ({ ...current, [supplier]: { kind: "result", result: data } }));
    } catch (error) {
      setCards((current) => ({
        ...current,
        [supplier]: {
          kind: "error",
          message: error instanceof Error ? error.message : "Supplier request failed."
        }
      }));
    }
  }, [machine]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Supplier BOM builds</h2>
        <p className="text-sm text-slate-500">
          Run suppliers independently, inspect their evidence, then explicitly merge or replace the active ledger.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SUPPLIER_IDS.map((supplier) => (
          <SupplierCard
            key={supplier}
            supplier={supplier}
            state={cards[supplier]}
            ready={ready}
            currentLedger={currentLedger}
            onRun={() => runSupplier(supplier)}
            onApply={onApply}
          />
        ))}
      </div>
      {!ready ? (
        <p className="mt-3 text-xs text-amber-700">
          Complete machine_id, brand, model, and serial before running a supplier.
        </p>
      ) : null}
    </section>
  );
}

function SupplierCard({
  supplier,
  state,
  ready,
  currentLedger,
  onRun,
  onApply
}: {
  supplier: SupplierId;
  state: CardState;
  ready: boolean;
  currentLedger: BomRow[];
  onRun: () => void;
  onApply: (supplier: SupplierId, rows: BomRow[], mode: ApplyMode) => Promise<void>;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{SUPPLIER_LABELS[supplier]}</h3>
        <button
          type="button"
          onClick={onRun}
          disabled={!ready || state.kind === "running"}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.kind === "running" ? "Running..." : "Fetch BOM"}
        </button>
      </div>

      <div className="mt-3 text-sm">
        {state.kind === "idle" ? <p className="text-slate-500">Not run.</p> : null}
        {state.kind === "running" ? <p className="text-slate-500">Building supplier result...</p> : null}
        {state.kind === "error" ? <p className="text-red-700">{state.message}</p> : null}
        {state.kind === "result" ? (
          <ResultBlock
            supplier={supplier}
            result={state.result}
            currentLedger={currentLedger}
            onApply={onApply}
          />
        ) : null}
      </div>
    </article>
  );
}

function ResultBlock({
  supplier,
  result,
  currentLedger,
  onApply
}: {
  supplier: SupplierId;
  result: SupplierResult;
  currentLedger: BomRow[];
  onApply: (supplier: SupplierId, rows: BomRow[], mode: ApplyMode) => Promise<void>;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [applying, setApplying] = useState<ApplyMode | null>(null);
  const overlap = useMemo(() => countOverlap(currentLedger, result.rows), [currentLedger, result.rows]);
  const status = statusFromResult(result);
  const provenance = result.provenance;

  async function apply(mode: ApplyMode) {
    setApplying(mode);
    try {
      await onApply(supplier, result.rows, mode);
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badgeClass(status.tone)}`}>
          {status.label}
        </span>
        <span>{result.rows.length} parts</span>
        {provenance?.expected_part_count ? (
          <span className="text-slate-500">/ {provenance.expected_part_count} expected</span>
        ) : null}
      </div>

      {provenance ? (
        <p className="text-xs text-slate-500">
          Completeness {(provenance.completeness_estimate * 100).toFixed(0)}% · {(provenance.elapsed_ms / 1000).toFixed(1)}s
        </p>
      ) : null}

      {result.sourceUrl ? (
        <a
          href={result.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-xs text-blue-700 underline"
          title={result.sourceUrl}
        >
          {result.sourceUrl}
        </a>
      ) : null}

      {provenance?.diagrams_visited.length ? (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer">Diagrams walked ({provenance.diagrams_visited.length})</summary>
          <p className="mt-1">{provenance.diagrams_visited.join(", ")}</p>
        </details>
      ) : null}

      {provenance?.visited_urls.length ? (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer">Visited URLs ({provenance.visited_urls.length})</summary>
          <ul className="mt-1 space-y-1">
            {provenance.visited_urls.map((url) => <li key={url} className="break-all">{url}</li>)}
          </ul>
        </details>
      ) : null}

      {result.warnings.length ? (
        <ul className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {result.warnings.map((warning) => <li key={warning}>· {warning}</li>)}
        </ul>
      ) : null}

      {result.rows.length ? (
        <>
          <button
            type="button"
            onClick={() => setPreviewOpen((open) => !open)}
            className="text-xs font-semibold text-slate-600 underline"
          >
            {previewOpen ? "Hide preview" : `Preview ${result.rows.length} rows`}
          </button>
          {previewOpen ? <RowPreview rows={result.rows} /> : null}
          <p className="text-xs text-slate-600">
            Compared with active ledger: {result.rows.length - overlap} new, {overlap} overlapping part numbers.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => apply("replace")}
              disabled={applying !== null}
              className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {applying === "replace" ? "Replacing..." : "Replace ledger"}
            </button>
            <button
              type="button"
              onClick={() => apply("merge")}
              disabled={applying !== null}
              className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {applying === "merge" ? "Merging..." : "Merge into ledger"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RowPreview({ rows }: { rows: BomRow[] }) {
  const visibleRows = rows.slice(0, 25);
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[620px] text-xs">
        <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-2 py-1">Part #</th>
            <th className="px-2 py-1">Diagram</th>
            <th className="px-2 py-1">Description</th>
            <th className="px-2 py-1">Price</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => (
            <tr key={`${row.part_number}-${row.diagram_id}-${index}`} className="border-t border-slate-100">
              <td className="px-2 py-1 font-mono">{row.part_number}</td>
              <td className="px-2 py-1">{row.diagram_id}</td>
              <td className="px-2 py-1">{row.description}</td>
              <td className="px-2 py-1 font-mono">{row.encompass_price}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > visibleRows.length ? (
        <p className="bg-slate-50 px-2 py-1 text-xs text-slate-500">
          ...and {rows.length - visibleRows.length} more rows
        </p>
      ) : null}
    </div>
  );
}

function countOverlap(current: BomRow[], incoming: BomRow[]): number {
  const currentParts = new Set(current.map((row) => row.part_number.trim().toUpperCase()));
  return new Set(
    incoming
      .map((row) => row.part_number.trim().toUpperCase())
      .filter((partNumber) => currentParts.has(partNumber))
  ).size;
}

function statusFromResult(result: SupplierResult): {
  label: string;
  tone: "ok" | "warn" | "miss" | "error";
} {
  if (result.warnings.includes("model_not_found")) return { label: "Model not found", tone: "miss" };
  if (result.warnings.includes("zero_diagrams_discovered")) return { label: "No diagrams", tone: "warn" };
  if (result.warnings.includes("zero_parts_extracted")) return { label: "Zero parts", tone: "warn" };
  if (result.warnings.some((warning) => warning.includes("error"))) return { label: "Supplier error", tone: "error" };
  return result.rows.length ? { label: "Found", tone: "ok" } : { label: result.status, tone: "warn" };
}

function badgeClass(tone: "ok" | "warn" | "miss" | "error"): string {
  if (tone === "ok") return "bg-emerald-100 text-emerald-800";
  if (tone === "error") return "bg-red-100 text-red-800";
  if (tone === "miss") return "bg-slate-200 text-slate-700";
  return "bg-amber-100 text-amber-800";
}
