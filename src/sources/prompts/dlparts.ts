import { Type, type Schema } from "@google/genai";
import { z } from "zod";
import type { Machine } from "@/src/lib/contracts";

function normalizeModel(model: string): string {
  return model.toUpperCase().replace(/[\s.-]/g, "");
}

export const STAGE_A_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    model_found: { type: Type.BOOLEAN },
    chosen_url: { type: Type.STRING },
    candidates_considered: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ["label", "url"]
      }
    },
    notes: { type: Type.STRING }
  },
  required: ["model_found", "chosen_url", "candidates_considered", "notes"]
};

export const StageAResponseSchema = z.object({
  model_found: z.boolean(),
  chosen_url: z.string(),
  candidates_considered: z.array(z.object({
    label: z.string(),
    url: z.string()
  })),
  notes: z.string()
});

export type StageAResponse = z.infer<typeof StageAResponseSchema>;

export const STAGE_B_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    diagrams: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ["name", "url"]
      }
    },
    expected_part_count: { type: Type.INTEGER },
    notes: { type: Type.STRING }
  },
  required: ["diagrams", "expected_part_count", "notes"]
};

export const StageBResponseSchema = z.object({
  diagrams: z.array(z.object({
    name: z.string().min(1),
    url: z.string().url()
  })),
  expected_part_count: z.number().int().nonnegative(),
  notes: z.string()
});

export type StageBResponse = z.infer<typeof StageBResponseSchema>;

export function buildStageAPrompt(machine: Machine): string {
  return `DLParts Stage A: resolve the exact model page.

TARGET
brand: ${machine.brand}
model: ${machine.model}
normalized model: ${normalizeModel(machine.model)}
serial: ${machine.serial}

Search https://www.dlpartscolookup.com/lookup using the raw and normalized model. Record every plausible candidate. Choose only the closest exact brand/model match. Use the serial to resolve a documented serial-range split when available. If no candidate matches, set model_found=false and chosen_url="".

Return JSON matching the Stage A schema.`;
}

export function buildStageBPrompt(modelPageUrl: string): string {
  return `DLParts Stage B: discover every diagram for the selected model.

MODEL PAGE
${modelPageUrl}

Fetch this exact model page. Return every exploded-view diagram name and direct URL. Do not extract parts yet and do not omit diagrams. Return the total supplier-claimed part count when visible, otherwise zero.

Return JSON matching the Stage B schema.`;
}

export function buildStageCPrompt(diagramName: string, diagramUrl: string): string {
  return `DLParts Stage C: extract every part from one diagram.

DIAGRAM
name: ${diagramName}
url: ${diagramUrl}

Fetch only this diagram and extract every certain OEM part. Set diagram_id="${diagramName}" on every row. Store the DLParts price in encompass_price. Record the exact URL in visited_urls and "${diagramName}" in diagrams_visited. Set model_found=true when the diagram loaded, even if no parts were visible.

Return JSON matching the provided BOM schema.`;
}
