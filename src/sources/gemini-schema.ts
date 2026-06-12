import { Type, type Schema } from "@google/genai";
import { z } from "zod";

export const BOM_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    rows: {
      type: Type.ARRAY,
      description: "Every part extracted from the exact appliance model.",
      items: {
        type: Type.OBJECT,
        properties: {
          part_number: { type: Type.STRING },
          diagram_id: { type: Type.STRING },
          description: { type: Type.STRING },
          encompass_price: {
            type: Type.STRING,
            description: "Supplier price, NLA, or an empty string."
          }
        },
        required: ["part_number", "diagram_id", "description", "encompass_price"]
      }
    },
    provenance: {
      type: Type.OBJECT,
      properties: {
        model_found: { type: Type.BOOLEAN },
        source_url: { type: Type.STRING },
        visited_urls: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        diagrams_visited: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        expected_part_count: {
          type: Type.INTEGER,
          description: "Supplier-reported part count, or zero when unknown."
        },
        notes: { type: Type.STRING }
      },
      required: [
        "model_found",
        "source_url",
        "visited_urls",
        "diagrams_visited",
        "expected_part_count",
        "notes"
      ]
    }
  },
  required: ["rows", "provenance"]
};

export const GeminiBomResponseSchema = z.object({
  rows: z.array(z.object({
    part_number: z.string(),
    diagram_id: z.string(),
    description: z.string(),
    encompass_price: z.string()
  })),
  provenance: z.object({
    model_found: z.boolean(),
    source_url: z.string(),
    visited_urls: z.array(z.string()),
    diagrams_visited: z.array(z.string()),
    expected_part_count: z.number().int().nonnegative(),
    notes: z.string()
  })
});

export type GeminiBomResponse = z.infer<typeof GeminiBomResponseSchema>;
