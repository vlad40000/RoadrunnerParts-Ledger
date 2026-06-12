import { describe, expect, it } from "vitest";
import { mergeBomRows } from "../src/lib/merge-bom";
import {
  buildSupplierLookupResult,
  mapWithConcurrency,
  normalizeSupplierRows,
  scoreCompleteness
} from "../src/sources/supplier-utils";

const EMPTY_PROVENANCE = {
  model_found: true,
  source_url: "https://example.test/model",
  visited_urls: ["https://example.test/model"],
  diagrams_visited: [] as string[],
  expected_part_count: 0,
  notes: ""
};

describe("supplier BOM builds", () => {
  it("distinguishes model-not-found from an empty extraction", () => {
    const notFound = buildSupplierLookupResult("fix", {
      rows: [],
      provenance: { ...EMPTY_PROVENANCE, model_found: false }
    }, 10);
    const empty = buildSupplierLookupResult("fix", {
      rows: [],
      provenance: EMPTY_PROVENANCE
    }, 10);

    expect(notFound.warnings).toContain("model_not_found");
    expect(notFound.warnings).not.toContain("zero_parts_extracted");
    expect(empty.warnings).toContain("zero_parts_extracted");
    expect(empty.warnings).not.toContain("model_not_found");
  });

  it("preserves the same part number when it appears in different diagrams", () => {
    const rows = normalizeSupplierRows([
      { part_number: "WP1", diagram_id: "Cabinet", description: "Screw", encompass_price: "" },
      { part_number: "WP1", diagram_id: "Drum", description: "Screw", encompass_price: "$2.00" },
      { part_number: "WP1", diagram_id: "Cabinet", description: "Screw", encompass_price: "$1.50" }
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.encompass_price).toBe("$1.50");
    expect(rows[1]?.diagram_id).toBe("Drum");
  });

  it("scores against the supplier count when one is available", () => {
    const rows = [
      { part_number: "A1", diagram_id: "", description: "", encompass_price: "" },
      { part_number: "A2", diagram_id: "", description: "", encompass_price: "" }
    ];
    expect(scoreCompleteness(rows, { ...EMPTY_PROVENANCE, expected_part_count: 4 })).toBe(0.5);
  });

  it("lets incoming supplier rows replace matching part numbers during merge", () => {
    const current = [
      { part_number: "A1", diagram_id: "Old", description: "Old row", encompass_price: "$1" },
      { part_number: "B1", diagram_id: "Keep", description: "Keep row", encompass_price: "$2" }
    ];
    const incoming = [
      { part_number: "A1", diagram_id: "New", description: "New row", encompass_price: "$3" }
    ];

    expect(mergeBomRows(current, incoming)).toEqual([
      current[1],
      incoming[0]
    ]);
  });

  it("caps parallel diagram work and preserves result order", async () => {
    let active = 0;
    let maxActive = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value * 10;
    });

    expect(maxActive).toBe(2);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });
});
