import "server-only";
import { load } from "cheerio";
import type { Machine } from "@/src/lib/contracts";
import type { PriceLookup } from "./types";
import { normalizePriceText } from "./normalize";

function searchUrl(partNumber: string): string {
  return `https://www.dlpartsco.com/search?q=${encodeURIComponent(partNumber)}`;
}

export async function lookupDlPartsCoPrice(partNumber: string, _machine: Machine): Promise<PriceLookup | null> {
  const response = await fetch(searchUrl(partNumber), {
    headers: { "user-agent": "RoadrunnerPartsLedger/0.1 fallback price lookup" },
    next: { revalidate: 3600 }
  });

  if (!response.ok) return null;
  const html = await response.text();
  const $ = load(html);
  const text = $("body").text().replace(/\s+/g, " ");
  const price = normalizePriceText(text);

  if (!price) return null;
  return { part_number: partNumber, encompass_price: price, source: "dlpartsco" };
}

export function buildDlPartsCoSearchUrl(partNumber: string): string {
  return searchUrl(partNumber);
}
