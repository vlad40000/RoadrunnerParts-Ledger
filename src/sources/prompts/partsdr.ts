import type { Machine } from "@/src/lib/contracts";
import type { PromptModule } from "../gemini-adapter";

function normalizeModel(model: string): string {
  return model.toUpperCase().replace(/[\s.-]/g, "");
}

export const partsdrPrompt: PromptModule = {
  name: "partsdr",
  buildPrompt(machine: Machine): string {
    const model = normalizeModel(machine.model);
    return `Extract the complete BOM for this exact appliance from PartsDr.com.

TARGET
brand: ${machine.brand}
model: ${machine.model}
normalized model: ${model}

Locate the exact model page using direct URLs or Google Search. Walk every available diagram or section. Return every certain OEM part number, diagram identifier, description, and PartsDr price in encompass_price.

Exclude customers-also-bought items, related models, and uncertain part numbers. Record every URL actually visited, every diagram actually walked, and the expected total part count when visible. Set model_found=false only when the exact model is not present.

Return JSON matching the provided schema.`;
  }
};
