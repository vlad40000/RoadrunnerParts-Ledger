import type { Machine } from "@/src/lib/contracts";
import type { PromptModule } from "../gemini-adapter";

function normalizeModel(model: string): string {
  return model.toUpperCase().replace(/[\s.-]/g, "");
}

export const searsPrompt: PromptModule = {
  name: "sears",
  buildPrompt(machine: Machine): string {
    const model = normalizeModel(machine.model);
    return `Extract the complete BOM for this exact appliance from Sears Parts Direct.

TARGET
brand: ${machine.brand}
model: ${machine.model}
normalized model: ${model}

Locate the exact model page using direct URLs or Google Search. Walk every parts diagram or section. Return every certain OEM part number, diagram or section identifier, description, and Sears price. Store the supplier price in encompass_price because that is the ledger's locked price column.

Exclude accessories, cross-sells, related-model parts, and uncertain part numbers. Record every URL actually visited, every diagram or section actually walked, and the supplier's expected total part count when visible. Set model_found=false only when the exact model is not present on Sears Parts Direct.

Return JSON matching the provided schema.`;
  }
};
