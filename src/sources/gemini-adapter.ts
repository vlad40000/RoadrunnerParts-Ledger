import "server-only";

import { GoogleGenAI, ThinkingLevel, type Tool } from "@google/genai";
import type { Machine } from "@/src/lib/contracts";
import { BOM_RESPONSE_SCHEMA, GeminiBomResponseSchema } from "./gemini-schema";
import { buildSupplierLookupResult, withTimeout } from "./supplier-utils";
import type { BomRunProvenance, BomSourceAdapter, LookupResult } from "./types";

const MODEL = "gemini-3.5-flash";
const TIMEOUT_MS = 60_000;
const TOOLS: Tool[] = [{ urlContext: {} }, { googleSearch: {} }];

export type PromptModule = {
  name: string;
  buildPrompt(machine: Machine): string;
};

export function makeGeminiAdapter(promptModule: PromptModule): BomSourceAdapter {
  return {
    name: promptModule.name,
    async lookupBom(machine: Machine): Promise<LookupResult> {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return failure(promptModule.name, "missing_api_key", "GEMINI_API_KEY is not configured.");
      }

      const started = Date.now();

      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await withTimeout(
          ai.models.generateContent({
            model: MODEL,
            contents: [{ role: "user", parts: [{ text: promptModule.buildPrompt(machine) }] }],
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
              tools: TOOLS,
              responseMimeType: "application/json",
              responseSchema: BOM_RESPONSE_SCHEMA
            }
          }),
          TIMEOUT_MS,
          `${promptModule.name} lookup exceeded ${TIMEOUT_MS}ms`
        );

        if (!response.text) {
          return failure(promptModule.name, "empty_response", "Gemini returned no response text.", Date.now() - started);
        }

        const parsed = GeminiBomResponseSchema.safeParse(JSON.parse(response.text));
        if (!parsed.success) {
          return failure(
            promptModule.name,
            "invalid_response",
            parsed.error.issues[0]?.message ?? "Gemini response did not match the BOM schema.",
            Date.now() - started
          );
        }

        return buildSupplierLookupResult(promptModule.name, parsed.data, Date.now() - started);
      } catch (error) {
        return failure(
          promptModule.name,
          "supplier_error",
          error instanceof Error ? error.message : String(error),
          Date.now() - started
        );
      }
    }
  };
}

export function failure(
  supplier: string,
  code: string,
  detail: string,
  elapsedMs = 0,
  modelFound = false
): LookupResult {
  const provenance: BomRunProvenance = {
    model_found: modelFound,
    source_url: "",
    visited_urls: [],
    diagrams_visited: [],
    expected_part_count: 0,
    notes: detail,
    completeness_estimate: 0,
    supplier,
    elapsed_ms: elapsedMs
  };

  return {
    rows: [],
    source: supplier,
    warnings: [code, detail],
    provenance
  };
}
