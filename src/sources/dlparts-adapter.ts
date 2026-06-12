import "server-only";

import { GoogleGenAI, ThinkingLevel, type Schema, type Tool } from "@google/genai";
import type { BomRow, Machine } from "@/src/lib/contracts";
import { BOM_RESPONSE_SCHEMA, GeminiBomResponseSchema, type GeminiBomResponse } from "./gemini-schema";
import { failure } from "./gemini-adapter";
import { mapWithConcurrency, normalizeSupplierRows, withTimeout } from "./supplier-utils";
import {
  STAGE_A_SCHEMA,
  STAGE_B_SCHEMA,
  StageAResponseSchema,
  StageBResponseSchema,
  buildStageAPrompt,
  buildStageBPrompt,
  buildStageCPrompt,
  type StageAResponse,
  type StageBResponse
} from "./prompts/dlparts";
import type { BomSourceAdapter, LookupResult } from "./types";

const MODEL = "gemini-3.5-flash";
const SUPPLIER = "dlparts";
const STAGE_TIMEOUT_MS = 45_000;
const DIAGRAM_CONCURRENCY = 4;
const TOOLS: Tool[] = [{ urlContext: {} }, { googleSearch: {} }];

export const dlpartsAdapter: BomSourceAdapter = {
  name: SUPPLIER,
  async lookupBom(machine: Machine): Promise<LookupResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return failure(SUPPLIER, "missing_api_key", "GEMINI_API_KEY is not configured.");

    const ai = new GoogleGenAI({ apiKey });
    const started = Date.now();
    const visitedUrls = ["https://www.dlpartscolookup.com/lookup"];

    let stageA: StageAResponse;
    try {
      stageA = await runStage(ai, buildStageAPrompt(machine), STAGE_A_SCHEMA, StageAResponseSchema.parse);
    } catch (error) {
      return failure(SUPPLIER, "stage_a_error", errorMessage(error), Date.now() - started);
    }

    if (!stageA.model_found || !stageA.chosen_url) {
      return {
        rows: [],
        source: SUPPLIER,
        warnings: ["model_not_found", `stage_a_notes: ${stageA.notes}`],
        provenance: {
          model_found: false,
          source_url: "",
          visited_urls: visitedUrls,
          diagrams_visited: [],
          expected_part_count: 0,
          notes: `Stage A considered ${stageA.candidates_considered.length} candidates. ${stageA.notes}`,
          completeness_estimate: 0,
          supplier: SUPPLIER,
          elapsed_ms: Date.now() - started
        }
      };
    }

    visitedUrls.push(stageA.chosen_url);

    let stageB: StageBResponse;
    try {
      stageB = await runStage(ai, buildStageBPrompt(stageA.chosen_url), STAGE_B_SCHEMA, StageBResponseSchema.parse);
    } catch (error) {
      return failure(SUPPLIER, "stage_b_error", errorMessage(error), Date.now() - started, true);
    }

    const diagrams = dedupeDiagrams(stageB.diagrams);
    if (diagrams.length === 0) {
      return {
        rows: [],
        source: SUPPLIER,
        sourceUrl: stageA.chosen_url,
        warnings: ["zero_diagrams_discovered", `stage_b_notes: ${stageB.notes}`],
        provenance: {
          model_found: true,
          source_url: stageA.chosen_url,
          visited_urls: visitedUrls,
          diagrams_visited: [],
          expected_part_count: stageB.expected_part_count,
          notes: stageB.notes,
          completeness_estimate: 0,
          supplier: SUPPLIER,
          elapsed_ms: Date.now() - started
        }
      };
    }

    const diagramResults = await mapWithConcurrency(diagrams, DIAGRAM_CONCURRENCY, async (diagram) => {
      try {
        const response = await runStage(
          ai,
          buildStageCPrompt(diagram.name, diagram.url),
          BOM_RESPONSE_SCHEMA,
          GeminiBomResponseSchema.parse
        );
        return { diagram, response };
      } catch (error) {
        return { diagram, error: errorMessage(error) };
      }
    });

    const warnings: string[] = [];
    const rawRows: GeminiBomResponse["rows"] = [];
    const diagramsVisited: string[] = [];

    for (const result of diagramResults) {
      if ("error" in result) {
        warnings.push(`stage_c_failed:${result.diagram.name}: ${result.error}`);
        continue;
      }

      diagramsVisited.push(result.diagram.name);
      visitedUrls.push(result.diagram.url, ...result.response.provenance.visited_urls);
      rawRows.push(...result.response.rows.map((row) => ({ ...row, diagram_id: result.diagram.name })));
    }

    const rows = normalizeSupplierRows(rawRows);
    if (rows.length === 0) warnings.push("zero_parts_extracted");

    const diagramCoverage = diagramsVisited.length / diagrams.length;
    const partCoverage = stageB.expected_part_count > 0
      ? Math.min(1, rows.length / stageB.expected_part_count)
      : diagramCoverage;

    return {
      rows,
      source: SUPPLIER,
      sourceUrl: stageA.chosen_url,
      warnings,
      provenance: {
        model_found: true,
        source_url: stageA.chosen_url,
        visited_urls: Array.from(new Set(visitedUrls)),
        diagrams_visited: diagramsVisited,
        expected_part_count: stageB.expected_part_count,
        notes: `Stage A: ${stageA.notes} Stage B: ${stageB.notes} Walked ${diagramsVisited.length}/${diagrams.length} diagrams.`,
        completeness_estimate: (diagramCoverage + partCoverage) / 2,
        supplier: SUPPLIER,
        elapsed_ms: Date.now() - started
      }
    };
  }
};

async function runStage<T>(
  ai: GoogleGenAI,
  prompt: string,
  schema: Schema,
  parse: (input: unknown) => T
): Promise<T> {
  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        tools: TOOLS,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }),
    STAGE_TIMEOUT_MS,
    `DLParts stage exceeded ${STAGE_TIMEOUT_MS}ms`
  );

  if (!response.text) throw new Error("Gemini returned no response text.");
  return parse(JSON.parse(response.text));
}

function dedupeDiagrams(diagrams: StageBResponse["diagrams"]): StageBResponse["diagrams"] {
  const byUrl = new Map<string, StageBResponse["diagrams"][number]>();
  for (const diagram of diagrams) byUrl.set(diagram.url, diagram);
  return Array.from(byUrl.values());
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
