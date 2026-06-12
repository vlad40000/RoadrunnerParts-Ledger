import "server-only";

import { dlpartsAdapter } from "./dlparts-adapter";
import { makeGeminiAdapter } from "./gemini-adapter";
import { fixPrompt } from "./prompts/fix";
import { partsdrPrompt } from "./prompts/partsdr";
import { reliablePrompt } from "./prompts/reliable";
import { searsPrompt } from "./prompts/sears";
import type { SupplierId } from "./supplier-config";
import type { BomSourceAdapter } from "./types";

export const BUTTON_ADAPTERS: Record<SupplierId, BomSourceAdapter> = {
  sears: makeGeminiAdapter(searsPrompt),
  fix: makeGeminiAdapter(fixPrompt),
  reliable: makeGeminiAdapter(reliablePrompt),
  partsdr: makeGeminiAdapter(partsdrPrompt),
  dlparts: dlpartsAdapter
};
