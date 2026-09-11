import type { ConcludeResult } from "./types";
import { mealNameForTime, parseFlexibleDateTime } from "./mealTime";
import { renameGuestSession } from "./guestStore";

const SESSIONS_CHANGED = "inschat-sessions-changed";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function stampFromDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function compactMonthDay(time: string, now: Date): string {
  const parsed = parseFlexibleDateTime(time, now);
  const date = parsed?.date
    ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const [, month, day] = date.split("-").map(Number);
  if (!month || !day) {
    return `${now.getMonth() + 1}/${now.getDate()}`;
  }
  return `${month}/${day}`;
}

function timeFromResult(result: ConcludeResult | null | undefined): string | undefined {
  const mealTime = result?.meals?.map((meal) => meal.time).find((time) => time?.trim());
  if (mealTime?.trim()) return mealTime.trim();
  const item = result?.items?.find((entry) =>
    /^(时间|time|timestamp|date|when)$/i.test(entry.name.trim())
  );
  return item?.value?.trim() || undefined;
}

function timeFromReply(text: string | undefined): string | undefined {
  if (!text?.trim()) return undefined;
  const bold = text.match(/\*\*([^*]+)\*\*/);
  if (bold?.[1] && parseFlexibleDateTime(bold[1])) return bold[1].trim();
  for (const line of text.split("\n")) {
    const clean = line.replace(/^#+\s*/, "").replace(/\*/g, "").trim();
    if (clean && parseFlexibleDateTime(clean)) return clean;
  }
  return undefined;
}

export function isAutoReplaceableTitle(title: string | null | undefined): boolean {
  const clean = (title ?? "").trim();
  if (!clean) return true;
  if (/^(new chat|新对话)$/i.test(clean)) return true;
  if (/^\d+([.,]\d+)?(\s*(mg\/dl|mmol\/l|mmol|mg|u|iu|单位))?$/i.test(clean)) {
    return true;
  }
  return false;
}

export function healthSessionTitle(input: {
  lang: "zh" | "en";
  result?: ConcludeResult | null;
  replyText?: string;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const time =
    timeFromResult(input.result) ??
    timeFromReply(input.replyText) ??
    stampFromDate(now);
  const meal = mealNameForTime(time, input.lang);
  return `${compactMonthDay(time, now)} ${meal}`;
}

export async function persistSessionTitle(opts: {
  sessionId: string;
  title: string;
  authed: boolean;
}): Promise<boolean> {
  if (opts.authed) {
    const response = await fetch(`/api/sessions/${opts.sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: opts.title }),
    });
    return response.ok;
  }
  renameGuestSession(opts.sessionId, opts.title);
  return true;
}

export function notifySessionsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSIONS_CHANGED));
}

export const SESSIONS_CHANGED_EVENT = SESSIONS_CHANGED;

export async function maybeRenameHealthSession(opts: {
  sessionId: string | null;
  authed: boolean;
  insulinMode: boolean;
  currentTitle: string | null | undefined;
  lang: "zh" | "en";
  result?: ConcludeResult | null;
  replyText?: string;
}): Promise<string | null> {
  if (!opts.insulinMode || !opts.sessionId) return null;
  if (!isAutoReplaceableTitle(opts.currentTitle)) return null;
  const title = healthSessionTitle({
    lang: opts.lang,
    result: opts.result,
    replyText: opts.replyText,
  });
  if (!title || title === (opts.currentTitle ?? "").trim()) return null;
  const saved = await persistSessionTitle({
    sessionId: opts.sessionId,
    title,
    authed: opts.authed,
  });
  if (!saved) return null;
  notifySessionsChanged();
  return title;
}
