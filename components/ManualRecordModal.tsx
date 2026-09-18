"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { STR, useUiLang } from "@/lib/i18n";
import { mealNameForTime } from "@/lib/mealTime";
import DateTimeInputs from "./DateTimeInputs";

type ManualImpact = "low" | "medium" | "high";
type ManualDishForm = { name: string; impact: ManualImpact | "" };
const BLOOD_SUGAR_UNITS = ["mg/dL", "mmol/L"] as const;

function impactTone(impact: ManualImpact | ""): string {
  if (impact === "medium") return "rank-mid";
  return impact ? `rank-${impact}` : "rank-none";
}

export type ManualRecordDraft =
  | {
      kind: "blood-sugar";
      dateTime: string;
      value: string;
      unit: string;
    }
  | {
      kind: "meal";
      dateTime: string;
      dishes: Array<{ name: string; impact: ManualImpact }>;
    };

function localDateTimeValue(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

export default function ManualRecordModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (draft: ManualRecordDraft) => Promise<void>;
}) {
  const lang = useUiLang();
  const t = STR[lang];
  const [tab, setTab] = useState<ManualRecordDraft["kind"]>("blood-sugar");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<(typeof BLOOD_SUGAR_UNITS)[number]>("mg/dL");
  const [dateTime, setDateTime] = useState(localDateTimeValue);
  const [dishes, setDishes] = useState<ManualDishForm[]>([{ name: "", impact: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === "blood-sugar") {
        await onSave({ kind: tab, dateTime, value: value.trim(), unit: unit.trim() });
      } else if (tab === "meal" && dishes.every((dish) => dish.name.trim() && dish.impact)) {
        await onSave({
          kind: tab,
          dateTime,
          dishes: dishes.map((dish) => ({
            name: dish.name.trim(),
            impact: dish.impact as ManualImpact,
          })),
        });
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t["common.requestFailed"]);
    } finally {
      setBusy(false);
    }
  };

  const updateDish = (index: number, patch: Partial<ManualDishForm>) => {
    setDishes((current) =>
      current.map((dish, dishIndex) => (dishIndex === index ? { ...dish, ...patch } : dish))
    );
  };

  const addDish = () => {
    setDishes((current) => [...current, { name: "", impact: "" }]);
  };

  const removeDish = (index: number) => {
    setDishes((current) => current.filter((_, dishIndex) => dishIndex !== index));
  };

  return (
    <div className="manual-record-backdrop" role="presentation" onClick={onClose}>
      <div
        className="manual-record-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-record-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="manual-record-head">
          <h2 id="manual-record-title">{t["records.manual.title"]}</h2>
          <button
            type="button"
            className="manual-record-close"
            onClick={onClose}
            aria-label={t["actions.cancel"]}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="manual-record-tabs" role="tablist" aria-label={t["records.manual.title"]}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "meal"}
            className={tab === "meal" ? "active" : ""}
            onClick={() => setTab("meal")}
          >
            {t["records.manual.meal"]}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "blood-sugar"}
            className={tab === "blood-sugar" ? "active" : ""}
            onClick={() => setTab("blood-sugar")}
          >
            {t["records.manual.bloodSugar"]}
          </button>
        </div>
        <form onSubmit={submit}>
          {tab === "blood-sugar" ? (
            <div className="manual-record-fields">
              <label>
                {t["records.manual.dateTime"]}
                <DateTimeInputs
                  value={dateTime}
                  lang={lang}
                  t={t}
                  onDisplay={setDateTime}
                />
              </label>
              <div className="manual-record-reading-row">
                <label>
                  {t["records.manual.value"]}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    required
                  />
                </label>
                <label>
                  {t["records.manual.unit"]}
                  <select value={unit} onChange={(event) => setUnit(event.target.value as typeof unit)}>
                    {BLOOD_SUGAR_UNITS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : (
            <div className="manual-record-fields">
              <label>
                {t["records.manual.dateTime"]}
                <DateTimeInputs
                  value={dateTime}
                  lang={lang}
                  t={t}
                  onDisplay={setDateTime}
                />
              </label>
              <p className="manual-record-derived">
                <strong>{mealNameForTime(dateTime, lang)}</strong>
              </p>
              <div className="manual-record-dishes">
                <span className="manual-record-section-label">
                  {t["records.manual.dishes"]}
                </span>
                {dishes.map((dish, index) => (
                  <div className="manual-record-dish-row" key={index}>
                    <input
                      className="manual-record-dish-input"
                      type="text"
                      value={dish.name}
                      onChange={(event) => updateDish(index, { name: event.target.value })}
                      aria-label={`${t["records.manual.dishName"]} ${index + 1}`}
                      required
                    />
                    <select
                      className={`manual-record-impact-chip ${impactTone(dish.impact)}`}
                      value={dish.impact}
                      onChange={(event) =>
                        updateDish(index, {
                          impact: event.target.value as ManualImpact | "",
                        })
                      }
                      aria-label={`${t["records.manual.impact"]} ${index + 1}`}
                      required
                    >
                      <option value="" disabled>
                        {t["records.manual.impactShort"]}
                      </option>
                      <option value="low">{t["records.manual.impactLowShort"]}</option>
                      <option value="medium">{t["records.manual.impactMediumShort"]}</option>
                      <option value="high">{t["records.manual.impactHighShort"]}</option>
                    </select>
                    {dishes.length > 1 && (
                      <button
                        type="button"
                        className="manual-record-remove-dish"
                        onClick={() => removeDish(index)}
                        aria-label={t["records.manual.removeDish"]}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="manual-record-add-dish" onClick={addDish}>
                  <Plus size={15} aria-hidden="true" />
                  {t["records.manual.addDish"]}
                </button>
              </div>
            </div>
          )}
          {error && <p className="manual-record-error">{error}</p>}
          <div className="manual-record-actions">
            <button type="button" className="manual-record-cancel" onClick={onClose} disabled={busy}>
              {t["actions.cancel"]}
            </button>
            <button type="submit" className="manual-record-save" disabled={busy}>
              {busy ? t["records.manual.saving"] : t["records.manual.save"]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
