export function parseReadingValue(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const normalized = String(value).replace(/,/g, "").trim();
  const match = normalized.match(/^-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}
