import type { SavedRecord } from "./types";
import { pairTimeItems, parseFlexibleDateTime } from "./mealTime";

export type TimelineRange = "day" | "week" | "quarter" | "year" | "all";

export interface GlucosePoint {
  id: string;
  recordId: string;
  value: number;
  unit?: string;
  ts: number;
}

export interface TimelineEntry {
  record: SavedRecord;
  ts: number;
  dateKey: string;
}

export interface TimelineBounds {
  start: number;
  end: number;
}

const GLUCOSE_NAMES = /^(血糖|glucose|blood glucose|blood sugar)$/i;

function dateKeyOf(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ownRecordTimestamp(record: SavedRecord): number {
  const ts = new Date(record.datetime ?? record.savedAt).getTime();
  return Number.isNaN(ts) ? Date.now() : ts;
}

function pointTimestamp(time: string | undefined, fallback: number): number {
  if (!time) return fallback;
  const fallbackDate = new Date(fallback);
  const parsed = parseFlexibleDateTime(time, fallbackDate);
  if (!parsed) return fallback;
  const [year, month, day] = parsed.date.split("-").map(Number);
  const [hour, minute] = parsed.time.split(":").map(Number);
  const ts = new Date(year, month - 1, day, hour, minute).getTime();
  return Number.isNaN(ts) ? fallback : ts;
}

function numericValue(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/^-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractGlucosePoints(records: SavedRecord[]): GlucosePoint[] {
  const points: GlucosePoint[] = [];
  for (const record of records) {
    const sources = record.events?.length
      ? record.events.map((event) => ({
          items: event.items,
          fallback: pointTimestamp(event.occurredAt, ownRecordTimestamp(record)),
        }))
      : [{ items: record.items, fallback: ownRecordTimestamp(record) }];
    sources.forEach((source, sourceIndex) => {
      pairTimeItems(source.items).forEach(({ item, time }, index) => {
        if (!GLUCOSE_NAMES.test(item.name.trim())) return;
        const value = numericValue(item.value);
        if (value === null) return;
        points.push({
          id: `${record._id}-${sourceIndex}-${index}`,
          recordId: record._id,
          value,
          unit: item.unit,
          ts: pointTimestamp(time, source.fallback),
        });
      });
    });
  }
  return points.sort((a, b) => a.ts - b.ts);
}

export function filterGlucosePoints(
  points: GlucosePoint[],
  range: TimelineRange,
  now = new Date()
): GlucosePoint[] {
  const bounds = timelineBounds(range, points, now);
  return points.filter((point) => point.ts >= bounds.start && point.ts <= bounds.end);
}

export function timelineBounds(
  range: TimelineRange,
  points: GlucosePoint[],
  now = new Date()
): TimelineBounds {
  if (range === "all") {
    if (points.length === 0) {
      return { start: now.getTime() - 86400000, end: now.getTime() };
    }
    const start = Math.min(...points.map((point) => point.ts));
    const end = Math.max(...points.map((point) => point.ts));
    if (start === end) return { start: start - 3600000, end: end + 3600000 };
    return { start, end };
  }
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "day") {
    start.setDate(start.getDate() - 1);
  } else if (range === "week") {
    start.setDate(start.getDate() - 7);
  } else if (range === "quarter") {
    start.setMonth(start.getMonth() - 3);
  } else if (range === "year") {
    start.setFullYear(start.getFullYear() - 1);
  }
  return { start: start.getTime(), end: now.getTime() };
}

export function recordTimelineEntries(records: SavedRecord[]): TimelineEntry[] {
  return records
    .map((record) => {
      const firstPoint = extractGlucosePoints([record])[0];
      const ts = firstPoint?.ts ?? ownRecordTimestamp(record);
      return { record, ts, dateKey: dateKeyOf(ts) };
    })
    .sort((a, b) => b.ts - a.ts);
}

export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function monthLabel(
  monthKey: string,
  lang: "zh" | "en"
): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(
    lang === "zh" ? "zh-CN" : "en-US",
    { year: "numeric", month: "long" }
  );
}
