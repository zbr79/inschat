export type AskKind = "choice" | "photo" | "text";

export interface AskPrompt {
  kind: AskKind;
  question: string;
  options: string[];
}

export const ASK_OPEN = "<ASK>";
export const ASK_CLOSE = "</ASK>";
export const CONCLUDE_OPEN = "<CONCLUDE>";

const ASK_BLOCK = /<ASK>([\s\S]*?)<\/ASK>/;
const CONCLUDE_BLOCK = /<CONCLUDE>[\s\S]*?<\/CONCLUDE>/g;

export function machineTailIndex(text: string): number {
  const ask = text.indexOf(ASK_OPEN);
  const conclude = text.indexOf(CONCLUDE_OPEN);
  if (ask === -1) return conclude;
  if (conclude === -1) return ask;
  return Math.min(ask, conclude);
}

export function stripConcludeBlock(text: string): string {
  return text
    .replace(CONCLUDE_BLOCK, "")
    .replace(/<CONCLUDE>[\s\S]*$/, "")
    .trimEnd();
}

function asKind(value: unknown): AskKind {
  if (value === "photo" || value === "image") return "photo";
  if (value === "choice" || value === "unit" || value === "options") return "choice";
  return "text";
}

function asOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const options: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      options.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const record = item as { label?: unknown; value?: unknown };
      const label =
        typeof record.label === "string"
          ? record.label.trim()
          : typeof record.value === "string"
            ? record.value.trim()
            : "";
      if (label) options.push(label);
    }
  }
  return options.slice(0, 8);
}

export function parseAskBlock(text: string): AskPrompt | null {
  const match = text.match(ASK_BLOCK);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[1] ?? "") as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;
    const question =
      (typeof raw.question === "string" && raw.question.trim()) ||
      (typeof raw.prompt === "string" && raw.prompt.trim()) ||
      "";
    const options = asOptions(raw.options);
    const kind = asKind(raw.kind);
    if (!question && options.length === 0 && kind !== "photo") return null;
    return {
      kind: options.length > 0 && kind === "text" ? "choice" : kind,
      question,
      options,
    };
  } catch {
    return null;
  }
}
