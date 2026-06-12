import { load } from "cheerio";
import type { BomRow } from "@/src/lib/contracts";
import { normalizeBomRow } from "@/src/lib/contracts";
import { normalizePriceText } from "./normalize";

type EncompassPart = {
  allowPurchase?: string;
  location?: string;
  partDescription?: string;
  partNumber?: string;
  partPrice?: string;
  reportPartPrice?: string;
};

function normalizeEncompassPrice(value: string): string {
  const normalized = normalizePriceText(value);
  if (normalized) return normalized;

  const bareAmount = value.trim().match(/^\d[\d,]*(?:\.\d{2})$/);
  return bareAmount ? `$${bareAmount[0]}` : "";
}

function extractJsonArray(value: string, key: string): string | null {
  const marker = `"${key}":[`;
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return null;

  const start = markerIndex + marker.length - 1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
    } else if (character === "[") {
      depth += 1;
    } else if (character === "]") {
      depth -= 1;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }

  return null;
}

function parseEmbeddedRows(html: string): BomRow[] {
  const $ = load(html);
  const payloads: string[] = [];

  $("script").each((_, element) => {
    const script = $(element).text();
    const prefix = "self.__next_f.push(";
    const start = script.indexOf(prefix);
    const end = script.lastIndexOf(")");
    if (start < 0 || end <= start) return;

    try {
      const value = JSON.parse(script.slice(start + prefix.length, end)) as unknown;
      if (Array.isArray(value) && typeof value[1] === "string") {
        payloads.push(value[1]);
      }
    } catch {
      // Ignore unrelated or malformed inline scripts.
    }
  });

  const candidates = [...payloads, payloads.join("")];
  for (const candidate of candidates) {
    const partsJson = extractJsonArray(candidate, "parts");
    if (!partsJson) continue;

    try {
      const parts = JSON.parse(partsJson) as EncompassPart[];
      return parts.flatMap((part) => {
        const partNumber = part.partNumber?.trim() ?? "";
        if (!partNumber) return [];

        const price = normalizeEncompassPrice(part.reportPartPrice ?? part.partPrice ?? "");
        return [normalizeBomRow({
          part_number: partNumber,
          diagram_id: part.location ?? "",
          description: part.partDescription ?? "",
          encompass_price: part.allowPurchase === "N" ? "NLA" : price
        })];
      });
    } catch {
      // Try the next payload candidate.
    }
  }

  return [];
}

function parseTableRows(html: string): BomRow[] {
  const $ = load(html);
  const rows: BomRow[] = [];
  const table = $("table").filter((_, element) =>
    /Part Number/i.test($(element).text())
  ).first();

  if (!table.length) return rows;

  const headerCells = table.find("tr").first().find("th,td").toArray();
  const headerIndexes = new Map<string, number>();
  for (const [index, cell] of headerCells.entries()) {
    const name = $(cell).text().replace(/\s+/g, " ").trim().toLowerCase();
    if (name) headerIndexes.set(name, index);
  }

  const partNumberIndex = headerIndexes.get("part number");
  const titleIndex = headerIndexes.get("part title");
  const priceIndex = headerIndexes.get("price");
  const availabilityIndex = headerIndexes.get("availability");

  if (partNumberIndex === undefined || titleIndex === undefined) return rows;

  table.find("tr").slice(1).each((_, tr) => {
    const cells = $(tr).find("td,th").toArray();
    if (cells.length <= Math.max(partNumberIndex, titleIndex)) return;

    const partNumber = $(cells[partNumberIndex]).text().trim();
    if (!partNumber || partNumber.length < 3) return;

    const titleLines = $(cells[titleIndex]).text()
      .split(/\n|(?=Schematic Location:)/)
      .map((line) => line.trim())
      .filter(Boolean);
    let diagramId = "";
    const description: string[] = [];

    for (const line of titleLines) {
      const schematic = line.match(/Schematic Location:\s*(\S+)/i);
      if (schematic) {
        diagramId = schematic[1] ?? "";
        continue;
      }
      if (/^Skill Level/i.test(line)) continue;
      description.push(line);
    }

    const priceText = priceIndex === undefined
      ? ""
      : normalizeEncompassPrice($(cells[priceIndex]).text());
    const availability = availabilityIndex === undefined
      ? ""
      : $(cells[availabilityIndex]).text().trim();

    rows.push(normalizeBomRow({
      part_number: partNumber,
      diagram_id: diagramId,
      description: description.join(" "),
      encompass_price: priceText || (/no longer available|discontinued|nla/i.test(availability) ? "NLA" : "")
    }));
  });

  return rows;
}

export function parseEncompassRows(html: string): BomRow[] {
  const tableRows = parseTableRows(html);
  const embeddedRows = parseEmbeddedRows(html);
  return embeddedRows.length > tableRows.length ? embeddedRows : tableRows;
}
