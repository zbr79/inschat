"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { STR, useUiLang } from "@/lib/i18n";
import { mealNameForTime, readingPhase } from "@/lib/mealTime";
import DateTimeInputs from "./DateTimeInputs";

type ManualImpact = "low" | "medium" | "high";
type ManualDishForm = { name: string; impact: ManualImpact | "" };
const BLOOD_SUGAR_UNITS = ["mg/dL", "mmol/L"] as const;
const MANUAL_RECORD_TAB_KEY = "inschat_manual_record_tab";

function impactTone(impact: ManualImpact | ""): string {
  if (impact === "medium") return "rank-mid";
  return impact ? `rank-${impact}` : "rank-none";
}

function nextImpact(impact: ManualImpact | ""): ManualImpact {
  if (impact === "low") return "medium";
  if (impact === "medium") return "high";
  if (impact === "high") return "low";
  return "low";
}

function impactLabel(impact: ManualImpact | "", t: Record<string, string>): string {
  if (impact === "low") return t["records.manual.impactLowShort"];
  if (impact === "medium") return t["records.manual.impactMediumShort"];
  if (impact === "high") return t["records.manual.impactHighShort"];
  return t["records.manual.impactShort"];
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
  const [dishes, setDishes] = useState<ManualDishForm[]>([
    { name: "", impact: "low" },
    { name: "", impact: "low" },
    { name: "", impact: "low" },
    { name: "", impact: "low" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dishesRef = useRef<HTMLDivElement>(null);
  const scrollAfterAdd = useRef(false);

  useEffect(() => {
    try {
      const storedTab = window.localStorage.getItem(MANUAL_RECORD_TAB_KEY);
      if (storedTab === "meal" || storedTab === "blood-sugar") {
        setTab(storedTab);
      }
    } catch {
      // Continue with the default tab when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!scrollAfterAdd.current) return;
    scrollAfterAdd.current = false;
    const frame = window.requestAnimationFrame(() => {
      const node = dishesRef.current;
      node?.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dishes.length]);

  const selectTab = (nextTab: ManualRecordDraft["kind"]) => {
    setTab(nextTab);
    try {
      window.localStorage.setItem(MANUAL_RECORD_TAB_KEY, nextTab);
    } catch {
      // The tab still changes when storage is unavailable.
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mealDishes =
      tab === "meal"
        ? dishes.filter((dish) => dish.name.trim()).map((dish) => ({
            name: dish.name.trim(),
            impact: dish.impact as ManualImpact,
          }))
        : [];
    if (tab === "meal" && mealDishes.length === 0) {
      setError(t["records.manual.dishesRequired"]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (tab === "blood-sugar") {
        await onSave({ kind: tab, dateTime, value: value.trim(), unit: unit.trim() });
      } else if (tab === "meal") {
        await onSave({
          kind: tab,
          dateTime,
          dishes: mealDishes,
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
    scrollAfterAdd.current = true;
    setDishes((current) => [
      ...current,
      { name: "", impact: "low" },
      { name: "", impact: "low" },
    ]);
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
            onClick={() => selectTab("meal")}
          >
            {t["records.manual.meal"]}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "blood-sugar"}
            className={tab === "blood-sugar" ? "active" : ""}
            onClick={() => selectTab("blood-sugar")}
          >
            {t["records.manual.bloodSugar"]}
          </button>
        </div>
        <form onSubmit={submit}>
          {tab === "blood-sugar" ? (
            <div className="manual-record-fields">
              <div className="manual-record-time-line">
                <p className="manual-record-derived">
                  <strong>{readingPhase(dateTime, lang)}</strong>
                </p>
                <label className="manual-record-time-field">
                  <DateTimeInputs
                    value={dateTime}
                    lang={lang}
                    t={t}
                    onDisplay={setDateTime}
                  />
                </label>
              </div>
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
              <div className="manual-record-time-line">
                <p className="manual-record-derived">
                  <strong>{mealNameForTime(dateTime, lang)}</strong>
                </p>
                <label className="manual-record-time-field">
                  <DateTimeInputs
                    value={dateTime}
                    lang={lang}
                    t={t}
                    onDisplay={setDateTime}
                  />
                </label>
              </div>
              <div className="manual-record-dishes" ref={dishesRef}>
                <div className="manual-record-dishes-head">
                  <span className="manual-record-section-label">
                    {t["records.manual.dishes"]}
                  </span>
                  <button
                    type="button"
                    className="manual-record-add-dish manual-record-add-dish-compact"
                    onClick={addDish}
                    aria-label={t["records.manual.addDish"]}
                    title={t["records.manual.addDish"]}
                  >
                    <Plus size={15} aria-hidden="true" />
                  </button>
                </div>
                <div className="manual-record-dish-grid">
                  {dishes.map((dish, index) => (
                    <div className="manual-record-dish-row" key={index}>
                      <div className="manual-record-dish-input-wrap">
                        <input
                          className="manual-record-dish-input"
                          type="text"
                          value={dish.name}
                          onChange={(event) => updateDish(index, { name: event.target.value })}
                          aria-label={`${t["records.manual.dishName"]} ${index + 1}`}
                        />
                        {dishes.length > 1 && (
                          <button
                            type="button"
                            className="manual-record-remove-dish"
                            onClick={() => removeDish(index)}
                            aria-label={t["records.manual.removeDish"]}
                          >
                            <X size={12} strokeWidth={2.5} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`manual-record-impact-chip ${impactTone(dish.impact)}`}
                        onClick={() => updateDish(index, { impact: nextImpact(dish.impact) })}
                        aria-label={`${t["records.manual.impact"]} ${index + 1}: ${impactLabel(
                          dish.impact,
                          t
                        )}`}
                        aria-pressed={Boolean(dish.impact)}
                      >
                        {impactLabel(dish.impact, t)}
                      </button>
                    </div>
                  ))}
                </div>
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
