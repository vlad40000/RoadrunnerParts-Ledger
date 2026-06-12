import { BOM_COLUMNS, type BomRow, type Machine, normalizeBomRow } from "./contracts";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      out.push(cell);
      cell = "";
      continue;
    }

    cell += char;
  }

  out.push(cell);
  return out.map((value) => value.trim());
}

function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += char + next;
      index += 1;
      continue;
    }

    if (char === '"') quoted = !quoted;

    if ((char === "\n" || char === "\r") && !quoted) {
      if (current.trim()) rows.push(current);
      current = "";
      if (char === "\r" && next === "\n") index += 1;
      continue;
    }

    current += char;
  }

  if (current.trim()) rows.push(current);
  return rows;
}

export function parseBomCsv(text: string): BomRow[] {
  const rows = splitCsvRows(text).filter((line) => !line.trim().startsWith("#"));
  if (!rows.length) return [];

  const header = parseCsvLine(rows[0]).map((value) => value.trim());
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));

  return rows.slice(1).flatMap((row) => {
    const cells = parseCsvLine(row);
    const candidate = {
      part_number: cells[indexes.part_number] ?? "",
      diagram_id: cells[indexes.diagram_id] ?? "",
      description: cells[indexes.description] ?? "",
      encompass_price: cells[indexes.encompass_price] ?? ""
    };

    if (!candidate.part_number.trim()) return [];
    return [normalizeBomRow(candidate)];
  });
}

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function serializeBomCsv(rows: BomRow[], machine?: Machine): string {
  const lines: string[] = [];

  if (machine) {
    lines.push(`# machine_id,${escapeCsv(machine.machine_id)}`);
    lines.push(`# brand,${escapeCsv(machine.brand)}`);
    lines.push(`# model,${escapeCsv(machine.model)}`);
    lines.push(`# serial,${escapeCsv(machine.serial)}`);
    if (machine.notes) lines.push(`# notes,${escapeCsv(machine.notes)}`);
    lines.push("");
  }

  lines.push(BOM_COLUMNS.join(","));
  for (const row of rows) {
    lines.push(BOM_COLUMNS.map((column) => escapeCsv(row[column])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

export function dedupeExactBomRows(rows: BomRow[]): BomRow[] {
  const seen = new Set<string>();
  const out: BomRow[] = [];

  for (const row of rows) {
    const normalized = normalizeBomRow(row);
    const key = JSON.stringify(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out;
}
