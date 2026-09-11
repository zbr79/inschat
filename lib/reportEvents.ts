import type {
  ConcludeItem,
  ConcludeMeal,
  ConcludeResult,
  ReportEvent,
} from "./types";
import { pairTimeItems } from "./mealTime";

const MAX_EVENTS = 100;
const MAX_EVENT_IMAGES = 3;
const MAX_TEXT = 500;

function cleanItems(raw: unknown): ConcludeItem[] {
  if (!Array.isArray(raw) || raw.length > 50) {
    throw new Error("event.items must be an array with at most 50 entries.");
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`event.items[${index}] is invalid.`);
    }
    const value = item as Record<string, unknown>;
    if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 100) {
      throw new Error(`event.items[${index}].name is invalid.`);
    }
    const clean: ConcludeItem = { name: value.name };
    if (value.value !== undefined) {
      if (typeof value.value !== "string" || value.value.length > MAX_TEXT) {
        throw new Error(`event.items[${index}].value is invalid.`);
      }
      if (value.value) clean.value = value.value;
    }
    if (value.unit !== undefined) {
      if (typeof value.unit !== "string" || value.unit.length > MAX_TEXT) {
        throw new Error(`event.items[${index}].unit is invalid.`);
      }
      if (value.unit) clean.unit = value.unit;
    }
    return clean;
  });
}

function cleanMeals(raw: unknown): ConcludeMeal[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > 20) {
    throw new Error("event.meals must be an array with at most 20 entries.");
  }
  return raw.map((meal, index) => {
    if (!meal || typeof meal !== "object") {
      throw new Error(`event.meals[${index}] is invalid.`);
    }
    const value = meal as Record<string, unknown>;
    if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 100) {
      throw new Error(`event.meals[${index}].name is invalid.`);
    }
    const clean: ConcludeMeal = { name: value.name };
    if (value.foods !== undefined) {
      if (typeof value.foods !== "string" || value.foods.length > MAX_TEXT) {
        throw new Error(`event.meals[${index}].foods is invalid.`);
      }
      if (value.foods) clean.foods = value.foods;
    }
    if (value.time !== undefined) {
      if (typeof value.time !== "string" || value.time.length > MAX_TEXT) {
        throw new Error(`event.meals[${index}].time is invalid.`);
      }
      if (value.time) clean.time = value.time;
    }
    if (value.dishes !== undefined) {
      if (!Array.isArray(value.dishes) || value.dishes.length > 30) {
        throw new Error(`event.meals[${index}].dishes is invalid.`);
      }
      clean.dishes = value.dishes.map((dish, dishIndex) => {
        if (!dish || typeof dish !== "object") {
          throw new Error(`event.meals[${index}].dishes[${dishIndex}] is invalid.`);
        }
        const rawDish = dish as Record<string, unknown>;
        if (
          typeof rawDish.name !== "string" ||
          !rawDish.name.trim() ||
          rawDish.name.length > 100
        ) {
          throw new Error(`event.meals[${index}].dishes[${dishIndex}].name is invalid.`);
        }
        const cleanDish: { name: string; rank?: string } = { name: rawDish.name };
        if (rawDish.rank !== undefined) {
          if (typeof rawDish.rank !== "string" || rawDish.rank.length > MAX_TEXT) {
            throw new Error(`event.meals[${index}].dishes[${dishIndex}].rank is invalid.`);
          }
          if (rawDish.rank) cleanDish.rank = rawDish.rank;
        }
        return cleanDish;
      });
    }
    return clean;
  });
}

function cleanImageKeys(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (
    !Array.isArray(raw) ||
    raw.length > MAX_EVENT_IMAGES ||
    raw.some((key) => typeof key !== "string" || key.length > 300)
  ) {
    throw new Error("event.imageKeys is invalid.");
  }
  return [...new Set(raw as string[])];
}

export function parseReportEvents(raw: unknown): ReportEvent[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > MAX_EVENTS) {
    throw new Error(`"events" must contain at most ${MAX_EVENTS} entries.`);
  }
  return raw.map((event, index) => {
    if (!event || typeof event !== "object") {
      throw new Error(`events[${index}] is invalid.`);
    }
    const value = event as Record<string, unknown>;
    if (typeof value.id !== "string" || !value.id || value.id.length > 300) {
      throw new Error(`events[${index}].id is invalid.`);
    }
    if (
      typeof value.occurredAt !== "string" ||
      !value.occurredAt ||
      value.occurredAt.length > 200
    ) {
      throw new Error(`events[${index}].occurredAt is invalid.`);
    }
    const sourceMessageId =
      value.sourceMessageId === undefined
        ? undefined
        : typeof value.sourceMessageId === "string" && value.sourceMessageId.length <= 300
          ? value.sourceMessageId
          : (() => {
              throw new Error(`events[${index}].sourceMessageId is invalid.`);
            })();
    return {
      id: value.id,
      occurredAt: value.occurredAt,
      sourceMessageId,
      items: cleanItems(value.items ?? []),
      meals: cleanMeals(value.meals),
      imageKeys: cleanImageKeys(value.imageKeys),
    };
  });
}

function firstEventTime(result: ConcludeResult): string | undefined {
  const mealTime = result.meals?.find((meal) => meal.time)?.time;
  if (mealTime) return mealTime;
  return pairTimeItems(result.items).find(({ time }) => time)?.time;
}

export function createReportEvent(
  result: ConcludeResult,
  sourceMessageId: string,
  fallbackDate: string,
  imageKeys?: string[]
): ReportEvent | null {
  if (!result.items.length && !result.meals?.length) return null;
  const occurredAt = firstEventTime(result) ?? fallbackDate;
  return {
    id: `message:${sourceMessageId}`,
    sourceMessageId,
    occurredAt,
    items: result.items,
    meals: result.meals,
    imageKeys: imageKeys?.length ? [...new Set(imageKeys)] : undefined,
  };
}

export function mergeReportEvents(
  existing: ReportEvent[] | undefined,
  incoming: ReportEvent | undefined
): ReportEvent[] {
  const events = [...(existing ?? [])];
  if (!incoming) return events;
  const index = events.findIndex((event) => event.id === incoming.id);
  if (index >= 0) {
    events[index] = incoming;
  } else {
    events.push(incoming);
  }
  return events;
}
