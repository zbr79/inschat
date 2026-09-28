import { cleanDishName } from "./dishName";
import { pairTimeItems } from "./mealTime";
import {
  flattenReportItems,
  flattenReportMeals,
  itemsFromPaired,
} from "./reportEvents";
import type { ConcludeItem, ConcludeMeal, ConcludeResult, ReportEvent } from "./types";

export interface DishReplacement {
  from: string;
  to: string;
  rank?: string;
}

export function parseDishReplacements(raw: unknown): DishReplacement[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    if (typeof value.from !== "string" || typeof value.to !== "string") return [];
    const from = cleanDishName(value.from);
    const to = cleanDishName(value.to);
    if (!from || !to) return [];
    const next: DishReplacement = { from, to };
    if (typeof value.rank === "string" && value.rank.trim()) next.rank = value.rank.trim();
    return [next];
  });
  return list.length ? list : undefined;
}

function namesMatch(saved: string, from: string): boolean {
  const left = saved.trim().toLowerCase();
  const right = from.trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function cloneMeal(meal: ConcludeMeal): ConcludeMeal {
  return { ...meal, dishes: meal.dishes?.map((dish) => ({ ...dish })) };
}

function renameMeal(meal: ConcludeMeal, replacements: DishReplacement[]): ConcludeMeal | null {
  const dishes = meal.dishes ?? [];
  let changed = false;
  const nextDishes = dishes.map((dish) => {
    const hit = [...replacements].reverse().find((item) => namesMatch(dish.name, item.from));
    if (!hit) return { ...dish };
    changed = true;
    return { ...dish, name: hit.to, rank: hit.rank || dish.rank };
  });
  if (!changed) return null;
  return {
    ...meal,
    dishes: nextDishes,
    foods: nextDishes.map((dish) => dish.name).join(", "),
  };
}

function applyReplacements(
  meals: ConcludeMeal[] | undefined,
  replacements: DishReplacement[]
): { meals: ConcludeMeal[] | undefined; changed: boolean } {
  if (!meals?.length) return { meals, changed: false };
  let changed = false;
  const next = meals.map(cloneMeal);
  for (let i = next.length - 1; i >= 0 && !changed; i--) {
    const renamed = renameMeal(next[i], replacements);
    if (!renamed) continue;
    next[i] = renamed;
    changed = true;
  }
  return { meals: changed ? next : meals, changed };
}

function replaceReadingItems(
  items: ConcludeItem[],
  incomingItems: ConcludeItem[]
): { items: ConcludeItem[]; changed: boolean } {
  const incoming = pairTimeItems(incomingItems).filter(
    (entry) => !/^(时间|time|timestamp|date|when|时段|phase)$/i.test(entry.item.name.trim())
  );
  if (!incoming.length) return { items, changed: false };
  const paired = pairTimeItems(items);
  let changed = false;
  for (const update of incoming) {
    for (let i = paired.length - 1; i >= 0; i--) {
      const sameName = paired[i].item.name.trim() === update.item.name.trim();
      const sameTime = !update.time || !paired[i].time || paired[i].time === update.time;
      if (!sameName || !sameTime) continue;
      paired[i] = {
        ...paired[i],
        item: {
          ...paired[i].item,
          value: update.item.value,
          unit: update.item.unit ?? paired[i].item.unit,
        },
      };
      changed = true;
      break;
    }
  }
  return { items: changed ? itemsFromPaired(paired) : items, changed };
}

/** Apply the dish and reading changes the model named. Does not add a meal. */
export function applyRecordCorrection(base: ConcludeResult, next: ConcludeResult): ConcludeResult {
  const replacements = next.replaces ?? [];
  let events: ReportEvent[] = (base.events ?? []).map((event) => ({
    ...event,
    items: event.items.map((item) => ({ ...item })),
    meals: event.meals?.map(cloneMeal),
  }));
  let mealsChanged = false;
  if (replacements.length) {
    for (let i = events.length - 1; i >= 0; i--) {
      const updated = applyReplacements(events[i].meals, replacements);
      if (!updated.changed) continue;
      events[i] = { ...events[i], meals: updated.meals };
      mealsChanged = true;
      break;
    }
  }
  const reading = replaceReadingItems(base.items, next.items);
  let items = reading.items;
  let readingsPatched = false;
  if (next.items.length && events.length) {
    const nextEvents = events.map((event) => {
      if (!event.items.length) return event;
      const updated = replaceReadingItems(event.items, next.items);
      if (!updated.changed) return event;
      readingsPatched = true;
      return { ...event, items: updated.items };
    });
    if (readingsPatched) events = nextEvents;
  }
  let meals = base.meals;
  if (events.length && (mealsChanged || readingsPatched)) {
    items = flattenReportItems(events) ?? items;
    meals = flattenReportMeals(events) ?? meals;
  } else if (replacements.length) {
    const updated = applyReplacements(base.meals, replacements);
    if (updated.changed) meals = updated.meals;
  }
  if (reading.changed && !readingsPatched) items = reading.items;
  return {
    title: next.title || base.title,
    summary: next.summary || base.summary,
    items,
    meals,
    imageKeys: base.imageKeys ?? next.imageKeys,
    events: events.length ? events : base.events,
  };
}
