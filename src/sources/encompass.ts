import "server-only";
import { load } from "cheerio";
import type { Machine } from "@/src/lib/contracts";
import type { LookupResult, PriceLookup } from "./types";
import { normalizeBrand, normalizeModel } from "./normalize";
import { gotScraping } from "got-scraping";
import { parseEncompassRows } from "./encompass-parser";

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
  try {
    const response = await gotScraping({
      url,
      headerGeneratorOptions: {
        browsers: [{ name: "chrome", minVersion: 110 }]
      }
    });
    const html = response.body;
    if (/Model is not valid for this site/i.test(html)) return null;
    return html;
  } catch (error) {
    console.error(`[encompass] Failed to fetch ${url}:`, error);
    return null;
  }
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

    const rows = parseEncompassRows(firstHtml);
    const pages = totalPages(firstHtml);

    for (let page = 2; page <= pages; page += 1) {
      const html = await fetchHtml(modelUrl(abv, machine.model, page));
      if (!html) {
        warnings.push(`Encompass page ${page} did not load; pagination stopped.`);
        break;
      }
      rows.push(...parseEncompassRows(html));
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
