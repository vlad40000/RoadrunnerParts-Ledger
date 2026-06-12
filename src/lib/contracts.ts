import { z } from "zod";

export const MachineSchema = z.object({
  machine_id: z.string().trim().min(1, "machine_id is required and must be manually entered"),
  brand: z.string().trim().min(1, "brand is required"),
  model: z.string().trim().min(1, "model is required"),
  serial: z.string().trim().min(1, "serial is required"),
  notes: z.string().optional().default("")
});

export const BomRowSchema = z.object({
  part_number: z.string().trim().min(1, "part_number is required"),
  diagram_id: z.string().trim().default(""),
  description: z.string().trim().default(""),
  encompass_price: z.string().trim().default("")
});

export const BomRowsSchema = z.array(BomRowSchema);

export type Machine = z.infer<typeof MachineSchema>;
export type BomRow = z.infer<typeof BomRowSchema>;

export const BOM_COLUMNS = [
  "part_number",
  "diagram_id",
  "description",
  "encompass_price"
] as const;

export type BomColumn = (typeof BOM_COLUMNS)[number];

export function normalizeMachine(input: unknown): Machine {
  return MachineSchema.parse(input);
}

export function normalizeBomRow(input: unknown): BomRow {
  const source = input as Record<string, unknown>;
  return BomRowSchema.parse({
    part_number: String(source?.part_number ?? source?.partNumber ?? source?.["Part Number"] ?? "").trim(),
    diagram_id: String(source?.diagram_id ?? source?.diagramId ?? source?.diagram ?? source?.["Diagram"] ?? "").trim(),
    description: String(source?.description ?? source?.desc ?? source?.["Description"] ?? "").trim(),
    encompass_price: String(source?.encompass_price ?? source?.encompassPrice ?? source?.price ?? source?.["Encompass"] ?? "").trim()
  });
}

export function stripBomRow(input: unknown): BomRow {
  return normalizeBomRow(input);
}
