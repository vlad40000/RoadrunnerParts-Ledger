import type { BomRow, Machine } from "@/src/lib/contracts";

export type BomRunProvenance = {
  model_found: boolean;
  source_url: string;
  visited_urls: string[];
  diagrams_visited: string[];
  expected_part_count: number;
  notes: string;
  completeness_estimate: number;
  supplier: string;
  elapsed_ms: number;
};

export type LookupResult = {
  rows: BomRow[];
  source: string;
  sourceUrl?: string;
  warnings: string[];
  provenance?: BomRunProvenance;
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
