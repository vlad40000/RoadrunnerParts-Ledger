import type { BomRow, Machine } from "@/src/lib/contracts";

function query(row: BomRow, machine: Machine): string {
  return [row.part_number, machine.brand, machine.model]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

export function buildEbayActiveUrl(row: BomRow, machine: Machine): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query(row, machine))}`;
}

export function buildEbaySoldUrl(row: BomRow, machine: Machine): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query(row, machine))}&LH_Sold=1&LH_Complete=1`;
}
