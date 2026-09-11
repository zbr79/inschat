"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ConcludeItem, ConcludeMeal, SavedRecord } from "@/lib/types";
import { cleanDishName } from "@/lib/dishName";
import { mealNameForTime } from "@/lib/mealTime";
import { useUiLang } from "@/lib/i18n";

export interface RecordEditDraft {
  title: string;
  summary: string;
  items: ConcludeItem[];
  meals?: ConcludeMeal[];
}

interface RecordEditModalProps {
  record: SavedRecord;
  labels: {
    title: string;
    close: string;
    reportTitle: string;
    summary: string;
    data: string;
    name: string;
    value: string;
    unit: string;
    meals: string;
    mealName: string;
    foods: string;
    time: string;
    cancel: string;
    save: string;
    saving: string;
  };
  onCancel: () => void;
  onSave: (draft: RecordEditDraft) => Promise<void>;
}

function draftFromRecord(record: SavedRecord): RecordEditDraft {
  return {
    title: record.title,
    summary: record.summary,
    items: record.items.map((item) => ({ ...item })),
    meals: record.meals?.map((meal) => ({
      ...meal,
      dishes: meal.dishes?.map((dish) => ({
        ...dish,
        name: cleanDishName(dish.name),
      })),
    })),
  };
}

export default function RecordEditModal({
  record,
  labels,
  onCancel,
  onSave,
}: RecordEditModalProps) {
  const [draft, setDraft] = useState(() => draftFromRecord(record));
  const [saving, setSaving] = useState(false);
  const lang = useUiLang();

  const updateItem = (index: number, patch: Partial<ConcludeItem>) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const updateMeal = (index: number, patch: Partial<ConcludeMeal>) => {
    setDraft((current) => ({
      ...current,
      meals: current.meals?.map((meal, mealIndex) =>
        mealIndex === index ? { ...meal, ...patch } : meal
      ),
    }));
  };

  const save = async () => {
    const cleanItems = draft.items.map((item) => ({
      ...item,
      name: item.name.trim(),
      value: item.value?.trim() || undefined,
      unit: item.unit?.trim() || undefined,
    }));
    if (cleanItems.some((item) => !item.name)) return;
    setSaving(true);
    try {
      await onSave({
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        items: cleanItems,
        meals: draft.meals?.map((meal) => ({
          ...meal,
          name: mealNameForTime(meal.time, lang),
          foods: meal.foods?.trim() || undefined,
          time: meal.time?.trim() || undefined,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="record-edit-backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="record-edit-modal" role="dialog" aria-modal="true" aria-labelledby="record-edit-title">
        <div className="record-edit-head">
          <h3 id="record-edit-title">{labels.title}</h3>
          <button type="button" className="record-edit-close" onClick={onCancel} aria-label={labels.close}>
            <X size={17} />
          </button>
        </div>

        <div className="record-edit-body">
          <label className="record-edit-field">
            <span>{labels.reportTitle}</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="record-edit-field">
            <span>{labels.summary}</span>
            <textarea
              value={draft.summary}
              rows={3}
              onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
            />
          </label>

          <section className="record-edit-section">
            <h4>{labels.data}</h4>
            <div className="record-edit-items">
              {draft.items.map((item, index) => (
                <div className="record-edit-item" key={index}>
                  <input
                    aria-label={labels.name}
                    placeholder={labels.name}
                    value={item.name}
                    onChange={(event) => updateItem(index, { name: event.target.value })}
                  />
                  <input
                    aria-label={labels.value}
                    placeholder={labels.value}
                    value={item.value ?? ""}
                    onChange={(event) => updateItem(index, { value: event.target.value })}
                  />
                  <input
                    aria-label={labels.unit}
                    placeholder={labels.unit}
                    value={item.unit ?? ""}
                    onChange={(event) => updateItem(index, { unit: event.target.value })}
                  />
                </div>
              ))}
            </div>
          </section>

          {draft.meals && draft.meals.length > 0 && (
            <section className="record-edit-section">
              <h4>{labels.meals}</h4>
              <div className="record-edit-meals">
                {draft.meals.map((meal, index) => (
                  <div className="record-edit-meal" key={index}>
                    <span className="record-edit-derived-meal-name">
                      {mealNameForTime(meal.time, lang)}
                    </span>
                    <input
                      aria-label={labels.foods}
                      placeholder={labels.foods}
                      value={meal.foods ?? ""}
                      onChange={(event) => updateMeal(index, { foods: event.target.value })}
                    />
                    <input
                      aria-label={labels.time}
                      placeholder={labels.time}
                      value={meal.time ?? ""}
                      onChange={(event) => updateMeal(index, { time: event.target.value })}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="record-edit-actions">
          <button type="button" className="record-edit-cancel" onClick={onCancel}>
            {labels.cancel}
          </button>
          <button type="button" className="record-edit-save" disabled={saving} onClick={save}>
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </>
  );
}
