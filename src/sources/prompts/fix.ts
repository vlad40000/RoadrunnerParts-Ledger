import type { Machine } from "@/src/lib/contracts";
import type { PromptModule } from "../gemini-adapter";

function normalizeModel(model: string): string {
  return model.toUpperCase().replace(/[\s.-]/g, "");
}

export const fixPrompt: PromptModule = {
  name: "fix",
  buildPrompt(machine: Machine): string {
    const model = normalizeModel(machine.model);
    return `Extract the complete BOM for this exact appliance from Fix.com.

TARGET
brand: ${machine.brand}
model: ${machine.model}
normalized model: ${model}

Locate the exact model page using direct URLs or Google Search. Walk every model section. Prefer the OEM/manufacturer part number over a Fix internal SKU. Return the section or diagram identifier, description, and Fix price in encompass_price.

Exclude related products, frequently-bought-together items, and uncertain part numbers. Record every URL actually visited, each section actually walked, and the expected total part count when visible. Set model_found=false only when the exact model is not present on Fix.com.

Return JSON matching the provided schema.`;
  }
};
