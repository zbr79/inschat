import fs from "node:fs";
import path from "node:path";

export interface ModelInfo {
  name: string;
  label: string;
  tier: "pro" | "flash";
  vision: boolean;
  retired?: boolean;
}

// opencode-go catalog: models reachable through the OpenAI-compatible
// /chat/completions endpoint of https://opencode.ai/zen/go/v1.
// Vision flags come from vendor documentation research:
// only models with documented image input are marked vision: true.
// Qwen3.8 Flash is the enforced text and image primary model.
export const CHAT_MODELS: ModelInfo[] = [
  { name: "deepseek-v4-pro", label: "DeepSeek V4 Pro", tier: "pro", vision: false, retired: true },
  { name: "deepseek-v4-flash", label: "DeepSeek V4 Flash", tier: "flash", vision: false },
  { name: "qwen3.8-flash", label: "Qwen3.8 Flash", tier: "flash", vision: true },
  { name: "deepseek-v4-flash-free", label: "DeepSeek V4 Flash (Free)", tier: "flash", vision: false },
  { name: "mimo-v2.5-free", label: "MiMo-V2.5 (Free)", tier: "flash", vision: false },
  { name: "big-pickle", label: "Big Pickle (Free)", tier: "flash", vision: false },
  { name: "nemotron-3-ultra-free", label: "Nemotron 3 Ultra (Free)", tier: "flash", vision: false },
  { name: "nemotron-3.5-lightning-free", label: "Nemotron 3.5 Lightning (Free)", tier: "flash", vision: false },
  { name: "ling-3.0-flash-fin-free", label: "Ling 3.0 Flash (Free)", tier: "flash", vision: false },
  { name: "laguna-s-2.1-free", label: "Laguna S 2.1 (Free)", tier: "flash", vision: false },
  { name: "deepseek-v4-flash-vision-exp", label: "DeepSeek V4 Flash Vision Exp", tier: "flash", vision: true },
  { name: "glm-5.3", label: "GLM-5.3", tier: "pro", vision: false },
  { name: "glm-5.3-flash", label: "GLM-5.3 Flash", tier: "flash", vision: true },
  { name: "glm-5.2", label: "GLM-5.2", tier: "pro", vision: false },
  { name: "glm-5.1", label: "GLM-5.1", tier: "pro", vision: false },
  { name: "glm-5", label: "GLM-5", tier: "pro", vision: false },
  { name: "kimi-k3", label: "Kimi K3", tier: "pro", vision: true },
  { name: "kimi-k2.7-code", label: "Kimi K2.7 Code", tier: "pro", vision: true },
  { name: "kimi-k2.6", label: "Kimi K2.6", tier: "pro", vision: true },
  { name: "kimi-k2.5", label: "Kimi K2.5", tier: "pro", vision: true },
  { name: "longcat-2.0", label: "LongCat-2.0", tier: "flash", vision: false },
  { name: "mimo-v2.5-pro", label: "MiMo-V2.5-Pro", tier: "pro", vision: true },
  { name: "mimo-v2.5", label: "MiMo-V2.5", tier: "flash", vision: true },
  { name: "mimo-v2-omni", label: "MiMo-V2-Omni", tier: "pro", vision: true },
  { name: "mimo-v2-pro", label: "MiMo-V2-Pro", tier: "pro", vision: false },
  { name: "qwen3.7-max", label: "Qwen3.7 Max", tier: "pro", vision: true },
  { name: "qwen3.7-plus", label: "Qwen3.7 Plus", tier: "pro", vision: true },
  { name: "qwen3.6-plus", label: "Qwen3.6 Plus", tier: "pro", vision: true },
  { name: "qwen3.5-plus", label: "Qwen3.5 Plus", tier: "pro", vision: true },
  { name: "hy4-preview", label: "Hy4 Preview", tier: "pro", vision: false },
  { name: "hy3", label: "Hy3", tier: "flash", vision: false },
  { name: "hy3-preview", label: "Hy3 Preview", tier: "flash", vision: false },
];

export function findModel(name: string): ModelInfo | undefined {
  return CHAT_MODELS.find((model) => model.name === name);
}

const DATA_DIR = path.join(process.cwd(), "data");
const MODEL_FILE = path.join(DATA_DIR, "model.json");

export const AUTO_MODEL = "auto";
export const PRIMARY_MODEL = "qwen3.8-flash";

// All automatic requests use Qwen3.8 Flash first. If the paid balance or
// model availability is exhausted, text and conclusion requests fall back to
// free models. Image requests use the same free fallback chain; those models
// may reject image input, in which case the user receives the image error.
const TEXT_CHAIN_FULL: string[] = [
  PRIMARY_MODEL,
  "deepseek-v4-flash-free",
  "mimo-v2.5-free",
  "nemotron-3-ultra-free",
  "nemotron-3.5-lightning-free",
  "ling-3.0-flash-fin-free",
  "laguna-s-2.1-free",
  "big-pickle",
];
export const IMAGE_CHAIN: string[] = [
  PRIMARY_MODEL,
  "deepseek-v4-flash-free",
  "mimo-v2.5-free",
  "nemotron-3-ultra-free",
  "nemotron-3.5-lightning-free",
  "ling-3.0-flash-fin-free",
  "laguna-s-2.1-free",
  "big-pickle",
];

// Conclusion extraction follows the same Qwen-first/free-only policy.
const CONCLUDE_CHAIN_FULL: string[] = [
  PRIMARY_MODEL,
  "deepseek-v4-flash-free",
  "mimo-v2.5-free",
  "nemotron-3-ultra-free",
  "nemotron-3.5-lightning-free",
  "ling-3.0-flash-fin-free",
  "laguna-s-2.1-free",
  "big-pickle",
];

function filterChain(chain: string[]): string[] {
  return chain.filter((name) => findModel(name) && !findModel(name)?.retired);
}

export function defaultModel(): string {
  return PRIMARY_MODEL;
}

export function getActiveModel(): string {
  return defaultModel();
}

export function setActiveModel(model: string): void {
  if (model !== AUTO_MODEL && model !== PRIMARY_MODEL) {
    throw new Error(`${PRIMARY_MODEL} is enforced for all requests.`);
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(MODEL_FILE, JSON.stringify({ model: PRIMARY_MODEL }));
}

// Every automatic request starts with Qwen3.8 Flash. The active-model file is
// retained for compatibility with existing deployments, but explicit pins
// cannot change this enforced routing policy.
export function getChatChain(hasImage: boolean): string[] {
  return filterChain(hasImage ? IMAGE_CHAIN : TEXT_CHAIN_FULL);
}

export function getConcludeChain(): string[] {
  return filterChain(CONCLUDE_CHAIN_FULL);
}
