import * as XLSX from "xlsx";
import { BOM_COLUMNS, type BomRow, type Machine, normalizeBomRow } from "./contracts";

export function parseBomXlsx(buffer: ArrayBuffer): BomRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  return rows.flatMap((row) => {
    const partNumber = String(row.part_number ?? row["part_number"] ?? "").trim();
    if (!partNumber) return [];
    return [normalizeBomRow(row)];
  });
}

export function createBomWorkbook(rows: BomRow[], machine?: Machine): XLSX.WorkBook {
  const data: Record<string, string>[] = rows.map((row) => ({
    part_number: row.part_number,
    diagram_id: row.diagram_id,
    description: row.description,
    encompass_price: row.encompass_price
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data, { header: [...BOM_COLUMNS] });
  XLSX.utils.book_append_sheet(workbook, worksheet, "BOM");

  if (machine) {
    const meta = [
      { field: "machine_id", value: machine.machine_id },
      { field: "brand", value: machine.brand },
      { field: "model", value: machine.model },
      { field: "serial", value: machine.serial },
      { field: "notes", value: machine.notes ?? "" }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(meta), "Machine");
  }

  return workbook;
}

export function writeBomXlsxArray(rows: BomRow[], machine?: Machine): ArrayBuffer {
  const workbook = createBomWorkbook(rows, machine);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
