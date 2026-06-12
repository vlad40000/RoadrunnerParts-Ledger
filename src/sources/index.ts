import type { BomRow, Machine } from "@/src/lib/contracts";
import { normalizeBomRow } from "@/src/lib/contracts";
import { dedupeExactBomRows } from "@/src/lib/csv";
import { lookupDlPartsCoPrice } from "./dlpartsco";
import { lookupEncompassBom } from "./encompass";

export async function lookupBom(machine: Machine): Promise<{ rows: BomRow[]; warnings: string[] }> {
  const result = await lookupEncompassBom(machine);
  const warnings = [...result.warnings];

  const rows = await Promise.all(
    result.rows.map(async (row) => {
      if (row.encompass_price) return normalizeBomRow(row);

      const fallback = await lookupDlPartsCoPrice(row.part_number, machine);
      if (fallback?.encompass_price) {
        return normalizeBomRow({ ...row, encompass_price: fallback.encompass_price });
      }

      return normalizeBomRow(row);
    })
  );

  return { rows: dedupeExactBomRows(rows), warnings };
}
