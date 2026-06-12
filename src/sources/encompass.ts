import "server-only";
import { load } from "cheerio";
import type { BomRow, Machine } from "@/src/lib/contracts";
import { normalizeBomRow } from "@/src/lib/contracts";
import type { LookupResult, PriceLookup } from "./types";
import { normalizeBrand, normalizeModel, normalizePriceText } from "./normalize";

const BRAND_TO_ABV: Record<string, string> = {
  ge: "hot",
  hotpoint: "hot",
  monogram: "hot",
  whirlpool: "whi",
  maytag: "whi",
  kitchenaid: "whi",
  "jenn-air": "whi",
  jennair: "whi",
  amana: "whi",
  frigidaire: "fri",
  electrolux: "fri",
  gibson: "fri",
  kelvinator: "fri",
  tappan: "fri",
  kenmore: "kmr",
  lg: "lge",
  samsung: "smg",
  bosch: "bch",
  thermador: "bch",
  haier: "hai",
  miele: "mie",
  "speed-queen": "SPQ",
  speedqueen: "SPQ",
  viking: "vik",
  dacor: "dac",
  danby: "dby"
};

const FALLBACK_ABV: Record<string, string> = { whi: "may" };

function abvCandidates(brand: string): string[] {
  const abv = BRAND_TO_ABV[normalizeBrand(brand)];
  if (!abv) return [];
  const fallback = FALLBACK_ABV[abv];
  return fallback ? [abv, fallback] : [abv];
}

function modelUrl(abv: string, model: string, page?: number): string {
  const root = `https://encompass.com/model/${abv.toUpperCase()}${normalizeModel(model)}`;
  return page && page > 1 ? `${root}/_/${page}` : root;
}

async function fetchHtml(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { "user-agent": "RoadrunnerPartsLedger/0.1 single-machine BOM lookup" },
    next: { revalidate: 3600 }
  });

  if (!response.ok) return null;
  const html = await response.text();
  if (/Model is not valid for this site/i.test(html)) return null;
  return html;
}

function parseRows(html: string): BomRow[] {
  const $ = load(html);
  const rows: BomRow[] = [];

  $("tr").each((_, tr) => {
    const cells = $(tr).find("td,th").toArray();
    if (cells.length < 5) return;

    const headerText = cells.slice(0, 3).map((cell) => $(cell).text().trim()).join(" ");
    if (/Part Number|Part Title/i.test(headerText)) return;

    const partNumber = $(cells[1]).text().trim();
    if (!partNumber || partNumber.length < 3) return;

    const titleLines = $(cells[2]).text().split(/\n|(?=Schematic Location:)/).map((line) => line.trim()).filter(Boolean);
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

    const priceText = normalizePriceText($(cells[4]).text().trim());
    const availability = cells[5] ? $(cells[5]).text().trim() : "";
    const price = priceText || (/no longer available|discontinued|nla/i.test(availability) ? "NLA" : "");

    rows.push(normalizeBomRow({
      part_number: partNumber,
      diagram_id: diagramId,
      description: description.join(" "),
      encompass_price: price
    }));
  });

  return rows;
}

function totalPages(html: string): number {
  const $ = load(html);
  const nums: number[] = [];
  $("a,li,span,button").each((_, element) => {
    const text = $(element).text().trim();
    if (/^\d+$/.test(text)) {
      const value = Number(text);
      if (value >= 1 && value <= 200) nums.push(value);
    }
  });
  return nums.length ? Math.max(...nums) : 1;
}

export async function lookupEncompassBom(machine: Machine): Promise<LookupResult> {
  const candidates = abvCandidates(machine.brand);
  const warnings: string[] = [];

  if (!candidates.length) {
    return { rows: [], source: "encompass", warnings: [`Unknown Encompass brand prefix for ${machine.brand}`] };
  }

  for (const abv of candidates) {
    const firstUrl = modelUrl(abv, machine.model);
    const firstHtml = await fetchHtml(firstUrl);
    if (!firstHtml) continue;

    const rows = parseRows(firstHtml);
    const pages = totalPages(firstHtml);

    for (let page = 2; page <= pages; page += 1) {
      const html = await fetchHtml(modelUrl(abv, machine.model, page));
      if (!html) {
        warnings.push(`Encompass page ${page} did not load; pagination stopped.`);
        break;
      }
      rows.push(...parseRows(html));
    }

    return { rows, source: "encompass", sourceUrl: firstUrl, warnings };
  }

  return { rows: [], source: "encompass", warnings: [`Model ${machine.model} was not found on Encompass for ${machine.brand}.`] };
}

export async function lookupEncompassPrice(partNumber: string, machine: Machine): Promise<PriceLookup | null> {
  const result = await lookupEncompassBom(machine);
  const match = result.rows.find((row) => row.part_number.toUpperCase() === partNumber.toUpperCase());
  if (!match?.encompass_price) return null;
  return { part_number: partNumber, encompass_price: match.encompass_price, source: "encompass" };
}
