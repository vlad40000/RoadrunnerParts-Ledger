import { describe, expect, it } from "vitest";
import { BOM_COLUMNS, BomRowSchema, MachineSchema, normalizeBomRow } from "../src/lib/contracts";
import { parseBomCsv, serializeBomCsv } from "../src/lib/csv";
import { buildEbayActiveUrl, buildEbaySoldUrl } from "../src/sources/ebay";

describe("Roadrunner Parts Ledger contract", () => {
  it("requires manual machine_id", () => {
    expect(MachineSchema.safeParse({ machine_id: "", brand: "GE", model: "X", serial: "Y" }).success).toBe(false);
    expect(MachineSchema.parse({ machine_id: "A-001", brand: "GE", model: "X", serial: "Y" }).machine_id).toBe("A-001");
  });

  it("keeps exactly four BOM columns", () => {
    expect(BOM_COLUMNS).toEqual(["part_number", "diagram_id", "description", "encompass_price"]);
  });

  it("strips unknown BOM fields", () => {
    const row = normalizeBomRow({ part_number: "WE1", diagram_id: "5", description: "Knob", encompass_price: "$9.00", notes: "drop", source: "drop" });
    expect(Object.keys(row)).toEqual(["part_number", "diagram_id", "description", "encompass_price"]);
    expect(BomRowSchema.parse(row)).toEqual(row);
  });

  it("CSV import ignores unknown columns", () => {
    const rows = parseBomCsv("part_number,diagram_id,description,encompass_price,notes,source\nWE1,5,Knob,$9.00,nope,nope\n");
    expect(rows).toEqual([{ part_number: "WE1", diagram_id: "5", description: "Knob", encompass_price: "$9.00" }]);
  });

  it("CSV export emits four BOM columns", () => {
    const csv = serializeBomCsv([{ part_number: "WE1", diagram_id: "5", description: "Knob", encompass_price: "$9.00" }]);
    expect(csv.split("\n")[0]).toBe("part_number,diagram_id,description,encompass_price");
  });

  it("eBay buttons build URLs but do not mutate rows", () => {
    const row = { part_number: "WE1", diagram_id: "5", description: "Knob", encompass_price: "$9.00" };
    const machine = { machine_id: "A-001", brand: "GE", model: "HTDX100ED3WW", serial: "S1", notes: "" };
    expect(buildEbayActiveUrl(row, machine)).toContain("ebay.com");
    expect(buildEbaySoldUrl(row, machine)).toContain("LH_Sold=1");
    expect(Object.keys(row)).toEqual(["part_number", "diagram_id", "description", "encompass_price"]);
  });
});
