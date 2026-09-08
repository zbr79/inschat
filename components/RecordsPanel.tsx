"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedRecord } from "@/lib/types";
import {
  addDemoGlucoseRecords,
  deleteGuestRecord,
  DEMO_RECORD_PREFIX,
  listGuestRecords,
  removeDemoGlucoseRecords,
  updateGuestRecord,
} from "@/lib/guestStore";
import { pairTimeItems, readingPhase } from "@/lib/mealTime";
import { isMealRelatedItem } from "@/lib/groupMeals";
import { STR, useUiLang } from "@/lib/i18n";
import GlucoseChart from "./GlucoseChart";
import RecordEditModal, { type RecordEditDraft } from "./RecordEditModal";
import {
  extractGlucosePoints,
  filterGlucosePoints,
  monthKeyOf,
  monthLabel,
  recordTimelineEntries,
  type TimelineEntry,
  type TimelineRange,
} from "@/lib/recordTimeline";

function rankClass(rank: string): string {
  const clean = rank.trim().toLowerCase();
  if (clean === "低" || clean === "low") return "low";
  if (clean === "中" || clean === "medium") return "mid";
  if (clean === "高" || clean === "high") return "high";
  return "none";
}

function toSavedRecord(record: {
  id: string;
  title: string;
  summary: string;
  items: SavedRecord["items"];
  meals?: SavedRecord["meals"];
  sourceText?: string;
  savedAt: string;
}): SavedRecord {
  return {
    _id: record.id,
    title: record.title,
    summary: record.summary,
    items: record.items,
    meals: record.meals,
    sourceText: record.sourceText,
    savedAt: record.savedAt,
    datetime: null,
  };
}

function dayKeyOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayLabel(
  dateKey: string,
  lang: "zh" | "en",
  t: Record<string, string>
): string {
  const now = new Date();
  const today = dayKeyOf(now.toISOString());
  const yesterday = dayKeyOf(new Date(now.getTime() - 86400000).toISOString());
  if (dateKey === today) return t["records.today"];
  if (dateKey === yesterday) return t["records.yesterday"];
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(lang === "zh" ? "zh-CN" : [], {
    month: "short",
    day: "numeric",
  });
}

export default function RecordsPanel() {
  const [guest, setGuest] = useState<boolean | null>(null);
  const [records, setRecords] = useState<SavedRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [range, setRange] = useState<TimelineRange>("week");
  const [demoBusy, setDemoBusy] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SavedRecord | null>(null);
  const lang = useUiLang();
  const t = STR[lang];

  const load = useCallback(async () => {
    if (guest === null) return;
    if (guest) {
      setRecords(listGuestRecords().map(toSavedRecord));
      setError(null);
      return;
    }
    try {
      const response = await fetch("/api/records");
      const body = await response.json();
       if (!response.ok) throw new Error(t["common.requestFailed"]);
      setRecords(body.records);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t["common.requestFailed"]);
    }
  }, [guest, lang]);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((response) => {
        if (alive) setGuest(response.status !== 200);
      })
      .catch(() => {
        if (alive) setGuest(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (deleting || guest === null) return;
    setDeleting(id);
    try {
      if (guest) {
        deleteGuestRecord(id);
        setRecords((prev) => prev?.filter((record) => record._id !== id) ?? null);
      } else {
        const response = await fetch(`/api/records?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const body = await response.json();
         if (!response.ok) throw new Error(t["common.requestFailed"]);
        setRecords((prev) => prev?.filter((record) => record._id !== id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t["common.requestFailed"]);
    } finally {
      setDeleting(null);
    }
  };

  const saveEditedRecord = async (draft: RecordEditDraft) => {
    if (!editingRecord || guest === null) return;
    const record = editingRecord;
    if (!draft.title.trim()) {
      setError(t["records.editTitle"]);
      return;
    }
    try {
      let updated: SavedRecord = {
        ...record,
        title: draft.title,
        summary: draft.summary,
        items: draft.items,
        meals: draft.meals,
      };
      if (guest) {
        updateGuestRecord(record._id, {
          title: draft.title,
          summary: draft.summary,
          items: draft.items,
          meals: draft.meals,
          sourceText: record.sourceText,
        });
      } else {
        const response = await fetch(`/api/records?id=${encodeURIComponent(record._id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            summary: draft.summary,
            items: draft.items,
            meals: draft.meals,
            sourceText: record.sourceText,
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || t["common.requestFailed"]);
        updated = body.record;
      }
      setRecords((prev) =>
        prev?.map((item) => (item._id === record._id ? updated : item)) ?? null
      );
      setEditingRecord(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t["common.requestFailed"]);
      throw err;
    }
  };

  const refreshGuestRecords = () => {
    setRecords(listGuestRecords().map(toSavedRecord));
    setError(null);
  };

  const loadDemo = () => {
    if (guest !== true || demoBusy) return;
    setDemoBusy(true);
    addDemoGlucoseRecords(60);
    refreshGuestRecords();
    setDemoBusy(false);
  };

  const removeDemo = () => {
    if (guest !== true || demoBusy) return;
    setDemoBusy(true);
    removeDemoGlucoseRecords();
    refreshGuestRecords();
    setDemoBusy(false);
  };

  const hasDemoData =
    records?.some((record) => record._id.startsWith(DEMO_RECORD_PREFIX)) ?? false;
  const entries: TimelineEntry[] = records ? recordTimelineEntries(records) : [];
  const glucosePoints = records
    ? filterGlucosePoints(extractGlucosePoints(records), range)
    : [];
  const monthGroups: {
    key: string;
    label: string;
    days: { key: string; label: string; entries: TimelineEntry[] }[];
  }[] = [];
  if (records) {
    for (const entry of entries) {
      const monthKey = monthKeyOf(entry.dateKey);
      const lastMonth = monthGroups[monthGroups.length - 1];
      const month =
        lastMonth?.key === monthKey
          ? lastMonth
          : (() => {
              const next = {
                key: monthKey,
                label: monthLabel(monthKey, lang),
                days: [] as { key: string; label: string; entries: TimelineEntry[] }[],
              };
              monthGroups.push(next);
              return next;
            })();
      const lastDay = month.days[month.days.length - 1];
      if (lastDay && lastDay.key === entry.dateKey) {
        lastDay.entries.push(entry);
      } else {
        month.days.push({
          key: entry.dateKey,
           label: dayLabel(entry.dateKey, lang, t),
          entries: [entry],
        });
      }
    }
  }

  return (
    <div className="usage-page">
      <div className="records-page-head">
        <div>
          <h2>{t["records.title"]}</h2>
          <p className="usage-sub">
            {guest === true ? t["records.subGuest"] : t["records.subOwner"]}
          </p>
        </div>
        {guest === true && (
          <div className="records-demo-actions">
            <div className="records-demo-buttons">
              <button
                type="button"
                className="records-demo-load"
                disabled={demoBusy}
                onClick={loadDemo}
              >
                {t["records.demo.load"]}
              </button>
              {hasDemoData && (
                <button
                  type="button"
                  className="records-demo-remove"
                  disabled={demoBusy}
                  onClick={removeDemo}
                >
                  {t["records.demo.remove"]}
                </button>
              )}
            </div>
            <span>{t["records.demo.hint"]}</span>
          </div>
        )}
      </div>

      {error && <p className="conclusion-error">{error}</p>}

      {records === null && !error && (
        <p className="usage-sub">{t["records.loading"]}</p>
      )}

      {records !== null && records.length === 0 && (
        <section className="usage-card">
          <span className="usage-title">{t["records.empty"]}</span>
        </section>
      )}

      {records !== null && records.length > 0 && (
        <GlucoseChart
          points={glucosePoints}
          range={range}
          onRangeChange={setRange}
          lang={lang}
          labels={{
            title: t["records.glucose.title"],
            subtitle: t["records.glucose.subtitle"],
            range: t["records.glucose.range"],
            day: t["records.glucose.day"],
            week: t["records.glucose.week"],
            quarter: t["records.glucose.quarter"],
            year: t["records.glucose.year"],
            all: t["records.glucose.all"],
            empty: t["records.glucose.empty"],
            bar: t["records.glucose.bar"],
            line: t["records.glucose.line"],
            timeline: t["records.glucose.timeline"],
            daily: t["records.glucose.daily"],
          }}
        />
      )}

      <div className="timeline">
        {monthGroups.map((month) => (
          <section key={month.key} className="timeline-month-group">
            <h3 className="timeline-month">{month.label}</h3>
            {month.days.map((day) => (
              <div key={day.key} className="timeline-day-group">
                <div className="timeline-day">{day.label}</div>
                {day.entries.map(({ record }) => {
              // Pair each reading with its own 时间 item FIRST (the time items
              // are meal-related and would be filtered out otherwise), then
              // drop meal-named rows.
              const paired = pairTimeItems(record.items).filter(
                ({ item }) => !isMealRelatedItem(item.name)
              );
                  return (
                    <div key={record._id} className="timeline-entry">
                      <span className="timeline-dot" aria-hidden="true" />
                      <div className="timeline-content">
                  {paired.length > 0 && (
                    <div className="timeline-readings">
                      {paired.map(({ item, time, phase }, index) => {
                        const derived = phase ?? readingPhase(time, lang);
                        return (
                          <span key={index} className="timeline-reading">
                            <span className="timeline-reading-main">
                              {item.name}
                              {derived ? ` ${derived}` : ""}
                              {item.value ? ` ${item.value}` : ""}
                              {item.unit ? ` ${item.unit}` : ""}
                            </span>
                            {time && (
                              <span className="timeline-reading-time">{time}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {record.meals && record.meals.length > 0 ? (
                    record.meals.map((meal, index) => (
                      <div key={index} className="timeline-meal">
                        <span className="meal-name">{meal.name}</span>
                        {meal.time && (
                          <span className="meal-time">{meal.time}</span>
                        )}
                        {(meal.dishes ?? []).length > 0 ? (
                          <span className="dish-grid">
                            {meal.dishes!.map((dish, dishIndex) => (
                              <span
                                key={dishIndex}
                                className={`dish-box${dish.rank ? ` rank-${rankClass(dish.rank)}` : ""}`}
                              >
                                <span className="dish-box-name">{dish.name}</span>
                                {dish.rank && (
                                  <span className="dish-box-rank">{dish.rank}</span>
                                )}
                              </span>
                            ))}
                          </span>
                        ) : (
                          meal.foods && <span className="meal-foods">{meal.foods}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    paired.length === 0 && (
                      <ul className="conclusion-items">
                        {record.items.map((item, index) => (
                          <li key={index}>
                            <span className="item-name">{item.name}</span>
                            {item.value && (
                              <span className="item-value">{item.value}</span>
                            )}
                            {item.unit && (
                              <span className="item-unit">{item.unit}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                        <div className="record-actions">
                          <button
                            type="button"
                            className="record-edit-trigger"
                            onClick={() => setEditingRecord(record)}
                          >
                            {t["records.edit"]}
                          </button>
                          <button
                            type="button"
                            className="record-delete"
                            disabled={deleting !== null}
                            onClick={() => remove(record._id)}
                          >
                            {deleting === record._id ? t["records.deleting"] : t["records.delete"]}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        ))}
      </div>
      {editingRecord && (
        <RecordEditModal
          record={editingRecord}
          labels={{
            title: t["records.editTitle"],
            close: t["actions.cancel"],
            reportTitle: t["records.field.title"],
            summary: t["records.field.summary"],
            data: t["records.field.data"],
            name: t["records.field.name"],
            value: t["records.field.value"],
            unit: t["records.field.unit"],
            meals: t["records.field.meals"],
            mealName: t["records.field.mealName"],
            foods: t["records.field.foods"],
            time: t["records.field.time"],
            cancel: t["actions.cancel"],
            save: t["records.save"],
            saving: t["records.saving"],
          }}
          onCancel={() => setEditingRecord(null)}
          onSave={saveEditedRecord}
        />
      )}
    </div>
  );
}
