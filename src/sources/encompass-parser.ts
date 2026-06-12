import { load } from "cheerio";
import type { BomRow } from "@/src/lib/contracts";
import { normalizeBomRow } from "@/src/lib/contracts";
import { normalizePriceText } from "./normalize";

function normalizeEncompassPrice(value: string): string {
  const normalized = normalizePriceText(value);
  if (normalized) return normalized;

  const bareAmount = value.trim().match(/^\d[\d,]*(?:\.\d{2})$/);
  return bareAmount ? `$${bareAmount[0]}` : "";
}

export function parseEncompassRows(html: string): BomRow[] {
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
