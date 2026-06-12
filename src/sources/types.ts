import type { BomRow, Machine } from "@/src/lib/contracts";

export type LookupResult = {
  rows: BomRow[];
  source: string;
  sourceUrl?: string;
  warnings: string[];
};

export type PriceLookup = {
  part_number: string;
  encompass_price: string;
  source: string;
};

export type BomSourceAdapter = {
  name: string;
  lookupBom(machine: Machine): Promise<LookupResult>;
  lookupPrice?(partNumber: string, machine: Machine): Promise<PriceLookup | null>;
};
