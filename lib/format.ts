// Client-safe helpers for the usage-limit banner.

export type LimitWindow = "rolling" | "weekly" | "monthly";

export function elapsedSeconds(startedAt: number): number {
  return Math.max(0, Math.round((Date.now() - startedAt) / 100) / 10);
}

export function formatElapsed(seconds: number): string {
  return seconds.toFixed(1);
}

export function trimStreamingEnd(text: string): string {
  return text.trimEnd();
}

export function parseLimitPayload(
  value: string
): { window: LimitWindow; resetAt: number } | null {
  const [window, resetAtRaw] = value.split("|");
  if (
    window !== "rolling" &&
    window !== "weekly" &&
    window !== "monthly"
  ) {
    return null;
  }
  const resetAt = Date.parse(resetAtRaw ?? "");
  if (Number.isNaN(resetAt)) return null;
  return { window, resetAt };
}

export function formatLimitReset(
  timestamp: number,
  lang: "zh" | "en"
): string {
  const date = new Date(timestamp);
  const now = new Date();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (date.toDateString() === now.toDateString()) {
    return time;
  }
  if (lang === "zh") {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
  }
  return `${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} ${time}`;
}
