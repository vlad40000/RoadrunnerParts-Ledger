import type { BomRow } from "@/src/lib/contracts";
import { normalizeBomRow } from "@/src/lib/contracts";
import type { GeminiBomResponse } from "./gemini-schema";
import type { LookupResult } from "./types";

export function normalizeSupplierRows(raw: GeminiBomResponse["rows"]): BomRow[] {
  const rowsByKey = new Map<string, BomRow>();

  for (const row of raw) {
    const partNumber = row.part_number.trim();
    if (partNumber.length < 3) continue;

    const normalized = normalizeBomRow({ ...row, part_number: partNumber });
    const key = [
      normalized.part_number.toUpperCase(),
      normalized.diagram_id.toUpperCase(),
      normalized.description.toUpperCase()
    ].join("|");
    const existing = rowsByKey.get(key);

    rowsByKey.set(key, existing
      ? { ...existing, encompass_price: existing.encompass_price || normalized.encompass_price }
      : normalized);
  }

  return Array.from(rowsByKey.values());
}

export function scoreCompleteness(
  rows: BomRow[],
  provenance: GeminiBomResponse["provenance"]
): number {
  if (!provenance.model_found || rows.length === 0) return 0;
  if (provenance.expected_part_count > 0) {
    return Math.min(1, rows.length / provenance.expected_part_count);
  }
  return provenance.diagrams_visited.length > 0 ? 0.75 : 0.5;
}

export function buildSupplierLookupResult(
  supplier: string,
  response: GeminiBomResponse,
  elapsedMs: number
): LookupResult {
  const rows = normalizeSupplierRows(response.rows);
  const warnings: string[] = [];

  if (!response.provenance.model_found) warnings.push("model_not_found");
  else if (rows.length === 0) warnings.push("zero_parts_extracted");
  if (response.provenance.notes) warnings.push(`note: ${response.provenance.notes}`);

  return {
    rows,
    source: supplier,
    sourceUrl: response.provenance.source_url || undefined,
    warnings,
    provenance: {
      ...response.provenance,
      completeness_estimate: scoreCompleteness(rows, response.provenance),
      supplier,
      elapsed_ms: elapsedMs
    }
  };
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(values[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), values.length) }, () => runWorker())
  );
  return results;
}
