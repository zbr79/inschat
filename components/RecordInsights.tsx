"use client";

import { useMemo } from "react";
import { localizeReadingPhase } from "@/lib/mealTime";
import {
  computeRecordInsights,
  type InsightMeal,
} from "@/lib/recordInsights";
import type { TimelineRange } from "@/lib/recordTimeline";
import type { SavedRecord } from "@/lib/types";
import { cleanDishName } from "@/lib/dishName";

interface RecordInsightsProps {
  records: SavedRecord[];
  lang: "zh" | "en";
  range: TimelineRange;
  labels: {
    title: string;
    period: string;
    highestGlucose: string;
    lowestGlucose: string;
    biggestJump: string;
    biggestDecrease: string;
    dangerousFoods: string;
    noData: string;
    noMeals: string;
  };
}

interface InsightFood {
  name: string;
  rank?: string;
}

function formatNumber(value: number, lang: "zh" | "en"): string {
  return new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(ts: number): string {
  const date = new Date(ts);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatComparisonDateRange(
  fromTs: number,
  toTs: number
): string {
  return `${formatShortDate(fromTs)} → ${formatShortDate(toTs)}`;
}

function mealFoods(meal: InsightMeal): InsightFood[] {
  const dishes =
    meal.meal.dishes
      ?.filter((dish) => cleanDishName(dish.name))
      .map((dish) => ({ name: cleanDishName(dish.name), rank: dish.rank })) ?? [];
  if (dishes.length === 0 && meal.meal.foods?.trim()) {
    dishes.push({ name: meal.meal.foods.trim(), rank: undefined });
  }
  return dishes;
}

function rankClass(rank: string | undefined): string {
  const clean = rank?.trim().toLowerCase();
  if (clean === "低" || clean === "low") return "low";
  if (clean === "中" || clean === "medium") return "mid";
  if (clean === "高" || clean === "high") return "high";
  return "none";
}

function rankedFoods(meals: InsightMeal[], allowedRanks: string[]) {
  const impactOrder = { high: 0, mid: 1 };
  return meals
    .flatMap(mealFoods)
    .filter((dish) => allowedRanks.includes(rankClass(dish.rank)))
    .sort(
      (a, b) =>
        (impactOrder[rankClass(a.rank) as keyof typeof impactOrder] ?? 99) -
        (impactOrder[rankClass(b.rank) as keyof typeof impactOrder] ?? 99)
    );
}

function FoodBubbles({ foods }: { foods: InsightFood[] }) {
  return (
    <div className="record-insight-foods">
      {foods.map((food, foodIndex) => (
        <span
          key={`${food.name}-${foodIndex}`}
          className={`record-insight-food-bubble rank-${rankClass(food.rank)}`}
        >
          {food.name}
        </span>
      ))}
    </div>
  );
}

export default function RecordInsights({
  records,
  lang,
  range,
  labels,
}: RecordInsightsProps) {
  const insights = useMemo(
    () => computeRecordInsights(records, range),
    [records, range]
  );
  const jump = insights.biggestJump;
  const phase = jump
    ? localizeReadingPhase(jump.phase, lang) ?? jump.phase
    : "";
  const increaseFoods = rankedFoods(jump?.fromMeals ?? [], ["high", "mid"]).slice(0, 3);
  const decreaseFoods = rankedFoods(jump?.toMeals ?? [], ["low"]).slice(0, 3);

  return (
    <section className="usage-card record-insights">
      <div className="record-insights-head">
        <h3>
          {labels.title} · {labels.period}
        </h3>
      </div>
      <div className="record-insights-grid">
        <article className="record-insight-card record-insight-glucose">
          <div className="record-insight-stat">
            <div className="record-insight-card-head">
              <span className="record-insight-label">{labels.highestGlucose}</span>
              {insights.highestGlucose && (
                <small className="record-insight-date">
                  {formatShortDate(insights.highestGlucose.ts)}
                </small>
              )}
            </div>
            <div className="record-insight-value-row">
              {insights.highestGlucose ? (
                <>
                  <strong>{formatNumber(insights.highestGlucose.value, lang)}</strong>
                  {insights.highestGlucose.unit && (
                    <span className="record-insight-unit">
                      {insights.highestGlucose.unit}
                    </span>
                  )}
                </>
              ) : (
                <strong>{labels.noData}</strong>
              )}
            </div>
          </div>
          <div className="record-insight-stat">
            <div className="record-insight-card-head">
              <span className="record-insight-label">{labels.lowestGlucose}</span>
              {insights.lowestGlucose && (
                <small className="record-insight-date">
                  {formatShortDate(insights.lowestGlucose.ts)}
                </small>
              )}
            </div>
            <div className="record-insight-value-row">
              {insights.lowestGlucose ? (
                <>
                  <strong>{formatNumber(insights.lowestGlucose.value, lang)}</strong>
                  {insights.lowestGlucose.unit && (
                    <span className="record-insight-unit">
                      {insights.lowestGlucose.unit}
                    </span>
                  )}
                </>
              ) : (
                <strong>{labels.noData}</strong>
              )}
            </div>
          </div>
          <div className="record-insight-stat record-insight-dangerous-stat">
            <div className="record-insight-card-head">
              <span className="record-insight-label">{labels.dangerousFoods}</span>
            </div>
            {insights.dangerousFoods.length > 0 ? (
              <FoodBubbles foods={insights.dangerousFoods} />
            ) : (
              <em className="record-insight-empty">{labels.noMeals}</em>
            )}
          </div>
        </article>
        <article className="record-insight-card record-insight-jump">
          <div className="record-insight-card-head">
            <span className="record-insight-label">
              {labels.biggestJump}
              {phase ? ` · ${phase}` : ""}
            </span>
            {jump && (
              <small className="record-insight-date">
                {formatComparisonDateRange(jump.fromTs, jump.toTs)}
              </small>
            )}
          </div>
          {jump ? (
            <>
              <div className="record-insight-value-row">
                <strong>
                  {formatNumber(Math.min(jump.from, jump.to), lang)} →{" "}
                  {formatNumber(Math.max(jump.from, jump.to), lang)}{" "}
                  <span className="record-insight-increase">
                    <span aria-hidden="true">▲</span>{" "}
                    {formatNumber(jump.delta, lang)}
                  </span>
                </strong>
                {jump.unit && (
                  <span className="record-insight-unit">{jump.unit}</span>
                )}
              </div>
              <div className="record-insight-meals">
                {increaseFoods.length > 0 ? (
                  <FoodBubbles foods={increaseFoods} />
                ) : (
                  <em>{labels.noMeals}</em>
                )}
              </div>
              <div className="record-insight-reverse">
                <div className="record-insight-card-head">
                  <span className="record-insight-label">
                    {labels.biggestDecrease}
                    {phase ? ` · ${phase}` : ""}
                  </span>
                  <small className="record-insight-date">
                    {formatComparisonDateRange(jump.fromTs, jump.toTs)}
                  </small>
                </div>
                <div className="record-insight-value-row">
                  <strong>
                    {formatNumber(Math.max(jump.from, jump.to), lang)} →{" "}
                    {formatNumber(Math.min(jump.from, jump.to), lang)}{" "}
                    <span className="record-insight-decrease">
                      <span aria-hidden="true">▼</span>{" "}
                      {formatNumber(jump.delta, lang)}
                    </span>
                  </strong>
                  {jump.unit && (
                    <span className="record-insight-unit">{jump.unit}</span>
                  )}
                </div>
                <div className="record-insight-reverse-foods">
                  {decreaseFoods.length > 0 ? (
                    <FoodBubbles foods={decreaseFoods} />
                  ) : (
                    <em>{labels.noMeals}</em>
                  )}
                </div>
              </div>
            </>
          ) : (
            <strong>{labels.noData}</strong>
          )}
        </article>
      </div>
    </section>
  );
}
