import type { BomRow } from "./contracts";
import { normalizeBomRow } from "./contracts";

export function mergeBomRows(current: BomRow[], incoming: BomRow[]): BomRow[] {
  const incomingPartNumbers = new Set(
    incoming.map((row) => row.part_number.trim().toUpperCase()).filter(Boolean)
  );
  const retained = current.filter(
    (row) => !incomingPartNumbers.has(row.part_number.trim().toUpperCase())
  );
  return dedupeBomRows([...retained, ...incoming]);
}

export function dedupeBomRows(rows: BomRow[]): BomRow[] {
  const byKey = new Map<string, BomRow>();
  for (const row of rows) {
    const normalized = normalizeBomRow(row);
    const key = [
      normalized.part_number.toUpperCase(),
      normalized.diagram_id.toUpperCase(),
      normalized.description.toUpperCase()
    ].join("|");
    byKey.set(key, normalized);
  }
  return Array.from(byKey.values());
}
