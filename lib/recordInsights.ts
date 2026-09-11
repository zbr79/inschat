import type { ConcludeMeal, SavedRecord } from "./types";
import { cleanDishName } from "./dishName";
import {
  localizeReadingPhase,
  pairTimeItems,
  parseFlexibleDateTime,
  readingPhase,
} from "./mealTime";
import type { TimelineRange } from "./recordTimeline";

const GLUCOSE_NAME = /^(血糖|glucose|blood glucose|blood sugar)$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BloodSugarStat {
  value: number;
  unit?: string;
  ts: number;
  dateKey: string;
}

export interface InsightMeal {
  meal: ConcludeMeal;
  ts: number;
}

export interface ImpactFoodStat {
  name: string;
  rank: "high" | "medium";
  count: number;
}

export interface GlucoseJumpStat {
  delta: number;
  from: number;
  to: number;
  unit?: string;
  fromTs: number;
  toTs: number;
  phase: string;
  fromMeals: InsightMeal[];
  toMeals: InsightMeal[];
}

export interface RecordInsights {
  highestGlucose: BloodSugarStat | null;
  lowestGlucose: BloodSugarStat | null;
  biggestJump: GlucoseJumpStat | null;
  dangerousFoods: ImpactFoodStat[];
}

interface TimedReading {
  value: number;
  unit?: string;
  ts: number;
  dateKey: string;
  phase: string;
}

function numericValue(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").trim().match(/^-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function foodImpactRank(value: string | undefined): "high" | "medium" | null {
  const clean = value?.trim().toLowerCase();
  if (clean === "高" || clean === "high") return "high";
  if (clean === "中" || clean === "medium") return "medium";
  return null;
}

function dateKeyOf(ts: number): string {
  const date = new Date(ts);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayOrdinal(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function recordTimestamp(record: SavedRecord, fallback: number): number {
  const value = record.recordedAt ?? record.datetime ?? record.savedAt;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : fallback;
}

function itemTimestamp(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseFlexibleDateTime(value, new Date(fallback));
  if (!parsed) return fallback;
  const [year, month, day] = parsed.date.split("-").map(Number);
  const [hour, minute] = parsed.time.split(":").map(Number);
  const ts = new Date(year, month - 1, day, hour, minute).getTime();
  return Number.isFinite(ts) ? ts : fallback;
}

function rangeStart(range: TimelineRange, now: Date): number {
  if (range === "all") return 0;
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
  return start.getTime();
}

function inRange(ts: number, range: TimelineRange, now: Date): boolean {
  return ts >= rangeStart(range, now) && ts <= now.getTime();
}

function mealKey(meal: ConcludeMeal, ts: number): string {
  const dishes = meal.dishes?.map((dish) => `${cleanDishName(dish.name)}:${dish.rank ?? ""}`).join("|") ?? "";
  return `${ts}|${meal.name}|${meal.foods ?? ""}|${dishes}`;
}

export function computeRecordInsights(
  records: SavedRecord[],
  range: TimelineRange,
  now = new Date()
): RecordInsights {
  const nowTs = now.getTime();
  const glucose: TimedReading[] = [];
  const mealsByDay = new Map<string, InsightMeal[]>();
  const foodStats = new Map<string, ImpactFoodStat>();

  for (const record of records) {
    const fallback = recordTimestamp(record, nowTs);
    for (const { item, time, phase: storedPhase } of pairTimeItems(record.items)) {
      const value = numericValue(item.value);
      if (value === null) continue;
      const ts = itemTimestamp(time, fallback);
      if (!inRange(ts, range, now)) continue;
      const dateKey = dateKeyOf(ts);
      if (GLUCOSE_NAME.test(item.name.trim())) {
        const phase =
          localizeReadingPhase(storedPhase, "zh") ?? readingPhase(time, "zh");
        glucose.push({ value, unit: item.unit, ts, dateKey, phase: phase ?? "" });
      }
    }

    for (const meal of record.meals ?? []) {
      const ts = itemTimestamp(meal.time, fallback);
      if (!inRange(ts, range, now)) continue;
      const dateKey = dateKeyOf(ts);
      const meals = mealsByDay.get(dateKey) ?? [];
      if (!meals.some((entry) => mealKey(entry.meal, entry.ts) === mealKey(meal, ts))) {
        meals.push({ meal, ts });
        for (const dish of meal.dishes ?? []) {
          const name = cleanDishName(dish.name);
          const rank = foodImpactRank(dish.rank);
          if (!name || !rank) continue;
          const key = name.toLocaleLowerCase();
          const existing = foodStats.get(key);
          if (existing) {
            existing.count += 1;
            if (rank === "high") existing.rank = "high";
          } else {
            foodStats.set(key, { name, rank, count: 1 });
          }
        }
      }
      mealsByDay.set(dateKey, meals);
    }
  }

  glucose.sort((a, b) => a.ts - b.ts);
  const sortedGlucose = [...glucose].sort((a, b) => a.value - b.value);

  const jumps: GlucoseJumpStat[] = [];
  const glucoseByPhase = new Map<string, TimedReading[]>();
  for (const reading of glucose) {
    if (!reading.phase) continue;
    const readings = glucoseByPhase.get(reading.phase) ?? [];
    readings.push(reading);
    glucoseByPhase.set(reading.phase, readings);
  }
  for (const [phase, readings] of glucoseByPhase) {
    const readingsByDate = new Map<string, TimedReading[]>();
    for (const reading of readings) {
      const readingsForDate = readingsByDate.get(reading.dateKey) ?? [];
      readingsForDate.push(reading);
      readingsByDate.set(reading.dateKey, readingsForDate);
    }
    const dates = [...readingsByDate.keys()].sort();
    for (let dateIndex = 0; dateIndex < dates.length - 1; dateIndex += 1) {
      const fromDate = dates[dateIndex];
      const toDate = dates[dateIndex + 1];
      if (dayOrdinal(toDate) - dayOrdinal(fromDate) !== 1) continue;
      for (const fromReading of readingsByDate.get(fromDate) ?? []) {
        for (const toReading of readingsByDate.get(toDate) ?? []) {
          jumps.push({
            delta: Math.abs(fromReading.value - toReading.value),
            from: fromReading.value,
            to: toReading.value,
            unit: fromReading.unit ?? toReading.unit,
            fromTs: fromReading.ts,
            toTs: toReading.ts,
            phase,
            fromMeals: mealsByDay.get(fromDate) ?? [],
            toMeals: mealsByDay.get(toDate) ?? [],
          });
        }
      }
    }
  }
  jumps.sort((a, b) => b.delta - a.delta);
  const dangerousFoods = [...foodStats.values()]
    .sort(
      (a, b) =>
        (a.rank === "high" ? 0 : 1) -
          (b.rank === "high" ? 0 : 1) ||
        b.count - a.count ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 5);

  return {
    highestGlucose: sortedGlucose.at(-1) ?? null,
    lowestGlucose: sortedGlucose[0] ?? null,
    biggestJump: jumps[0] ?? null,
    dangerousFoods,
  };
}
