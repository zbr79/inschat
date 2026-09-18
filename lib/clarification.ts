export interface Clarification {
  question: string;
  options?: { label: string; description?: string }[];
}

const UNIT_OPTIONS = ["mg/dL", "mmol/L"];
const SELECTION_CUE =
  /(reply|respond|choose|select|pick|please (?:tell|confirm|specify)|回复|选择|请选择|选一个|告诉我|确认一下|哪种|哪个)/i;

function meaningfulLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

function questionLine(lines: string[]): string {
  return (
    lines.find((line) => SELECTION_CUE.test(line) && line.length <= 280) ??
    lines.find((line) => /[?？]\s*$/.test(line) && line.length <= 280) ??
    lines.at(-1) ??
    ""
  );
}

function optionDescription(text: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = text
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) =>
      new RegExp(`^(?:if\\s+(?:the\\s+value\\s+is\\s+)?|如果是\\s*)?${escaped}\\b`, "i").test(
        candidate
      )
    );
  const description = line?.split(/→|->/).slice(1).join("→").trim();
  return description || undefined;
}

function explicitOptions(
  text: string
): { label: string; description?: string }[] | undefined {
  const quoted = text.match(
    /[「"“']([^」"”']+)[」"”']\s*(?:、|或|or)\s*[「"“']([^」"”']+)[」"”']/i
  );
  if (quoted && SELECTION_CUE.test(text)) {
    return [quoted[1].trim(), quoted[2].trim()].map((label) => {
      const description = optionDescription(text, label);
      return description ? { label, description } : { label };
    });
  }

  const hasBothUnits =
    /\bmg\/?\s*dL\b/i.test(text) && /\bmmol\/?\s*L\b/i.test(text);
  if (hasBothUnits && SELECTION_CUE.test(text)) {
    return UNIT_OPTIONS.map((label) => {
      const description = optionDescription(text, label);
      return description ? { label, description } : { label };
    });
  }
  return undefined;
}

export function detectClarification(text: string): Clarification | null {
  const options = explicitOptions(text);
  if (!options) return null;

  const lines = meaningfulLines(text);
  const question = questionLine(lines);
  if (!question || question.length > 280) return null;

  return { question, options };
}
