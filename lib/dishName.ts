import type { ConcludeMeal, ConcludeResult } from "./types";

const TRAILING_GLOSS = /(?:\s*[（(][^（）()]*[）)])+$/u;

export function cleanDishName(name: string): string {
  const original = name.trim();
  if (!original) return original;
  let next = original;
  for (;;) {
    const stripped = next.replace(TRAILING_GLOSS, "").trim();
    if (stripped === next) break;
    next = stripped;
  }
  return next || original;
}

export function sanitizeConcludeMeals(
  meals: ConcludeMeal[] | undefined
): ConcludeMeal[] | undefined {
  if (!meals) return meals;
  return meals.map((meal) => ({
    ...meal,
    dishes: meal.dishes?.map((dish) => ({
      ...dish,
      name: cleanDishName(dish.name),
    })),
  }));
}

export function sanitizeConcludeResult(result: ConcludeResult): ConcludeResult {
  return {
    ...result,
    meals: sanitizeConcludeMeals(result.meals),
  };
}

export function cleanDishNamesInReply(text: string): string {
  return text.replace(/([🟢🟡🔴]\s*)([^\n|]*)/g, (_full, emoji: string, rest: string) => {
    const pad = rest.match(/(\s*)$/)?.[1] ?? "";
    const trimmed = rest.trim();
    const wrapped = trimmed.startsWith("**") && trimmed.endsWith("**");
    const inner = wrapped ? trimmed.slice(2, -2).trim() : trimmed;
    const cleaned = cleanDishName(inner);
    if (wrapped) return `${emoji}**${cleaned}**${pad}`;
    return `${emoji}${cleaned}${pad}`;
  });
}
