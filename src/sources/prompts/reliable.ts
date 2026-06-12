import type { Machine } from "@/src/lib/contracts";
import type { PromptModule } from "../gemini-adapter";

function normalizeModel(model: string): string {
  return model.toUpperCase().replace(/[\s.-]/g, "");
}

export const reliablePrompt: PromptModule = {
  name: "reliable",
  buildPrompt(machine: Machine): string {
    const model = normalizeModel(machine.model);
    return `Extract the complete BOM for this exact appliance from ReliableParts.com.

TARGET
brand: ${machine.brand}
model: ${machine.model}
normalized model: ${model}

Locate the exact model page using direct URLs or Google Search. Walk every available diagram or section and return every certain OEM part number, diagram identifier, description, and visible Reliable price in encompass_price.

Reliable pricing may require login. Keep valid part rows when no price is visible and leave encompass_price empty. Note login walls in provenance.notes. Exclude cross-sells and uncertain part numbers. Record every URL actually visited and every diagram actually walked. Set model_found=false only when the exact model is not present.

Return JSON matching the provided schema.`;
  }
};
