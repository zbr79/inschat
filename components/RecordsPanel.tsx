"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedRecord } from "@/lib/types";
import {
  addDemoGlucoseRecords,
  DEMO_RECORD_PREFIX,
  deleteGuestRecord,
  listGuestRecords,
  removeDemoGlucoseRecords,
  updateGuestRecord,
} from "@/lib/guestStore";
import {
  localizeReadingPhase,
  mealNameForTime,
  pairTimeItems,
  parseFlexibleDateTime,
  readingPhase,
} from "@/lib/mealTime";
import { isMealRelatedItem } from "@/lib/groupMeals";
import { STR, useUiLang } from "@/lib/i18n";
import { getGlucoseRange, setGlucoseRange } from "@/lib/prefs";
import ConcludeModal from "./ConcludeModal";
import DatePickerModal from "./DatePickerModal";
import FullDayEditModal from "./FullDayEditModal";
import GlucoseChart from "./GlucoseChart";
import GlucoseRangeControl from "./GlucoseRangeControl";
import RecordEditModal, { type RecordEditDraft } from "./RecordEditModal";
import RecordInsights from "./RecordInsights";
import RecordImages from "./RecordImages";
import ReportTransferControls from "./ReportTransferControls";
import {
  extractGlucosePoints,
  filterGlucosePoints,
  monthKeyOf,
  monthLabel,
  type GlucosePoint,
  type TimelineRange,
} from "@/lib/recordTimeline";

function rankClass(rank: string): string {
  const clean = rank.trim().toLowerCase();
  if (clean === "低" || clean === "low") return "low";
  if (clean === "中" || clean === "medium") return "mid";
  if (clean === "高" || clean === "high") return "high";
  return "none";
}

function displayMetricName(name: string, bloodSugarLabel: string): string {
  return /^(血糖|胰岛素|glucose|insulin|blood glucose|blood sugar)$/i.test(name.trim())
    ? bloodSugarLabel
    : name;
}

function toSavedRecord(record: {
  id: string;
  title: string;
  summary: string;
  items: SavedRecord["items"];
  meals?: SavedRecord["meals"];
  sourceText?: string;
  imageKeys?: string[];
  savedAt: string;
  recordedAt?: string;
  sessionId?: string;
}): SavedRecord {
  return {
    _id: record.id,
    title: record.title,
    summary: record.summary,
    items: record.items,
    meals: record.meals,
    sourceText: record.sourceText,
    imageKeys: record.imageKeys,
    savedAt: record.savedAt,
    datetime: record.recordedAt ?? null,
    recordedAt: record.recordedAt,
    sessionId: record.sessionId,
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

type MixedRecordEvent =
  | {
      kind: "reading";
      item: SavedRecord["items"][number];
      time?: string;
      phase?: string;
      ts: number;
    }
  | {
      kind: "meal";
      meal: NonNullable<SavedRecord["meals"]>[number];
      ts: number;
    };

type TimelineDayRecord = {
  record: SavedRecord;
  events: MixedRecordEvent[];
};

type TimelineDayGroup = {
  key: string;
  label: string;
  entries: TimelineDayRecord[];
};

type TimelineMonthGroup = {
  key: string;
  label: string;
  days: TimelineDayGroup[];
};

function eventTimestamp(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseFlexibleDateTime(value);
  if (parsed) {
    const ts = Date.parse(`${parsed.date}T${parsed.time}`);
    if (Number.isFinite(ts)) return ts;
  }
  const direct = new Date(value).getTime();
  return Number.isFinite(direct) ? direct : fallback;
}

function mixedRecordEvents(record: SavedRecord): MixedRecordEvent[] {
  const fallback = eventTimestamp(
    record.recordedAt ?? record.datetime ?? record.savedAt,
    Date.now()
  );
  const readings: MixedRecordEvent[] = pairTimeItems(record.items)
    .filter(({ item }) => !isMealRelatedItem(item.name))
    .map(({ item, time, phase }) => ({
      kind: "reading" as const,
      item,
      time,
      phase,
      ts: eventTimestamp(time, fallback),
    }));
  const meals: MixedRecordEvent[] = (record.meals ?? []).map((meal) => ({
    kind: "meal" as const,
    meal,
    ts: eventTimestamp(meal.time, fallback),
  }));
  return [...readings, ...meals].sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;
    if (a.kind === b.kind) return 0;
    return a.kind === "reading" ? -1 : 1;
  });
}

function calendarDayLabel(dateKey: string, lang: "zh" | "en"): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(
    lang === "zh" ? "zh-CN" : "en-US",
    { month: "long", day: "numeric" }
  );
}

function displayEventTime(value: string | undefined, lang: "zh" | "en"): string {
  if (!value) return "";
  const parsed = parseFlexibleDateTime(value);
  const ts = parsed
    ? new Date(`2000-01-01T${parsed.time}`).getTime()
    : new Date(value).getTime();
  if (Number.isNaN(ts)) return value;
  return new Date(ts).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function RecordsPanel({
  fullReport = false,
  merged = false,
}: {
  fullReport?: boolean;
  merged?: boolean;
}) {
  const showBrief = merged || !fullReport;
  const showFull = merged || fullReport;
  const [guest, setGuest] = useState<boolean | null>(null);
  const [records, setRecords] = useState<SavedRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [range, setRange] = useState<TimelineRange>("week");
  const [editingRecord, setEditingRecord] = useState<SavedRecord | null>(null);
  const [editingDay, setEditingDay] = useState<TimelineDayGroup | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timelineVisibleDays, setTimelineVisibleDays] = useState(7);
  const lang = useUiLang();
  const t = STR[lang];
  useEffect(() => {
    const storedRange = getGlucoseRange();
    if (storedRange) setRange(storedRange);
  }, []);

  const handleRangeChange = useCallback((nextRange: TimelineRange) => {
    setRange(nextRange);
    setGlucoseRange(nextRange);
  }, []);

  const editingResult = useMemo(
    () =>
      editingRecord
        ? {
            title: editingRecord.title,
            summary: editingRecord.summary,
            items: editingRecord.items,
            meals: editingRecord.meals,
            imageKeys: editingRecord.imageKeys,
          }
        : null,
    [editingRecord]
  );

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
    const onRecordsChanged = () => {
      void load();
    };
    window.addEventListener("inschat-records-changed", onRecordsChanged);
    return () => window.removeEventListener("inschat-records-changed", onRecordsChanged);
  }, [load]);

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
          imageKeys: record.imageKeys,
          sessionId: record.sessionId,
          recordedAt: record.recordedAt ?? record.datetime ?? record.savedAt,
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
            imageKeys: record.imageKeys,
            sessionId: record.sessionId,
            recordedAt: record.recordedAt ?? record.datetime ?? record.savedAt,
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

  const hasDemoData = records?.some((record) =>
    record._id.startsWith(DEMO_RECORD_PREFIX)
  ) ?? false;

  const loadDemo = () => {
    if (demoBusy || guest !== true) return;
    setDemoBusy(true);
    try {
      addDemoGlucoseRecords(30);
      refreshGuestRecords();
    } finally {
      setDemoBusy(false);
    }
  };

  const removeDemo = () => {
    if (demoBusy || guest !== true) return;
    setDemoBusy(true);
    try {
      removeDemoGlucoseRecords();
      refreshGuestRecords();
    } finally {
      setDemoBusy(false);
    }
  };

  const toggleDemo = () => {
    if (hasDemoData) {
      removeDemo();
    } else {
      loadDemo();
    }
  };

  const glucosePoints = records
    ? filterGlucosePoints(extractGlucosePoints(records), range)
    : [];
  const monthGroups: TimelineMonthGroup[] = [];
  if (records) {
    const daysByKey = new Map<string, TimelineDayGroup>();
    for (const record of records) {
      const events = mixedRecordEvents(record);
      const eventsByDay = new Map<string, MixedRecordEvent[]>();
      for (const event of events) {
        const key = dayKeyOf(new Date(event.ts).toISOString());
        eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
      }
      if (eventsByDay.size === 0) {
        const fallback = eventTimestamp(
          record.recordedAt ?? record.datetime ?? record.savedAt,
          Date.now()
        );
        eventsByDay.set(dayKeyOf(new Date(fallback).toISOString()), []);
      }
      for (const [dayKey, dayEvents] of eventsByDay) {
        const day =
          daysByKey.get(dayKey) ??
          (() => {
            const next: TimelineDayGroup = {
              key: dayKey,
              label: dayLabel(dayKey, lang, t),
              entries: [],
            };
            daysByKey.set(dayKey, next);
            return next;
          })();
        day.entries.push({ record, events: dayEvents });
      }
    }
    const sortedDays = [...daysByKey.values()].sort((a, b) => b.key.localeCompare(a.key));
    for (const day of sortedDays) {
      const monthKey = monthKeyOf(day.key);
      const month =
        monthGroups.find((candidate) => candidate.key === monthKey) ??
        (() => {
          const next: TimelineMonthGroup = {
            key: monthKey,
            label: monthLabel(monthKey, lang),
            days: [],
          };
          monthGroups.push(next);
          return next;
        })();
      day.entries.sort((a, b) => {
        const aTs = a.events[0]?.ts ?? 0;
        const bTs = b.events[0]?.ts ?? 0;
        return bTs - aTs;
      });
      month.days.push(day);
    }
    monthGroups.sort((a, b) => b.key.localeCompare(a.key));
  }
  const timelineDays = monthGroups.flatMap((month) => month.days);
  const visibleDayKeys = new Set(
    selectedDate
      ? [selectedDate]
      : timelineDays.slice(0, timelineVisibleDays).map((day) => day.key)
  );
  const visibleMonthGroups = monthGroups
    .map((month) => ({
      ...month,
      days: month.days.filter((day) => visibleDayKeys.has(day.key)),
    }))
    .filter((month) => month.days.length > 0);
  const hasMoreTimelineDays =
    !selectedDate && timelineVisibleDays < timelineDays.length;
  const recordCounts = Object.fromEntries(
    monthGroups.flatMap((month) =>
      month.days.map((day) => [day.key, day.entries.length] as const)
    )
  );
  const daysByKey = new Map(
    monthGroups.flatMap((month) => month.days.map((day) => [day.key, day] as const))
  );
  const openDayForPoint = (point: GlucosePoint) => {
    const day = daysByKey.get(dayKeyOf(new Date(point.ts).toISOString()));
    if (!day) return;
    setEditingDay(day);
    setError(null);
  };

  return (
    <div className="usage-page">
      <div className="records-page-head">
        <div>
          <h2>{merged ? t["nav.records"] : fullReport ? t["records.fullTitle"] : t["records.title"]}</h2>
        </div>
        {showBrief && (
          <GlucoseRangeControl
            range={range}
            onRangeChange={handleRangeChange}
            labels={{
              range: t["records.glucose.range"],
              day: t["records.glucose.day"],
              week: t["records.glucose.week"],
              quarter: t["records.glucose.quarter"],
              year: t["records.glucose.year"],
              all: t["records.glucose.all"],
            }}
          />
        )}
        {showFull && records !== null && (
          <ReportTransferControls
            records={records}
            guest={guest}
            onImported={load}
            labels={{
              export: t["records.export"],
              import: t["records.import"],
              importing: t["records.importing"],
              imported: (count) => t["records.imported"].replace("{count}", String(count)),
              error: t["records.transferError"],
            }}
          />
        )}
        {showBrief && guest === true && (
          <div className="records-demo-actions">
            <div className="records-demo-buttons">
              <button
                type="button"
                className={hasDemoData ? "records-demo-remove" : undefined}
                onClick={toggleDemo}
                disabled={demoBusy}
              >
                {demoBusy
                  ? t["records.demo.loading"]
                  : hasDemoData
                    ? t["records.demo.remove"]
                    : t["records.demo.load"]}
              </button>
            </div>
          </div>
        )}
      </div>
      {showFull && (
        <DatePickerModal
          open={datePickerOpen}
          value={selectedDate}
          locale={lang === "zh" ? "zh-CN" : "en-US"}
          recordCounts={recordCounts}
          labels={{
            title: t["records.datePickerTitle"],
            today: t["records.dateToday"],
            cancel: t["records.dateCancel"],
          }}
          onClose={() => setDatePickerOpen(false)}
          onSelect={setSelectedDate}
        />
      )}

      {error && <p className="conclusion-error">{error}</p>}

      {records === null && !error && (
        <p className="usage-sub">{t["records.loading"]}</p>
      )}

      {records !== null && records.length === 0 && (
        <section className="usage-card">
          <span className="usage-title">{t["records.empty"]}</span>
        </section>
      )}

      {showBrief && records !== null && records.length > 0 && (
        <RecordInsights
          records={records}
          lang={lang}
          range={range}
          labels={{
            title: t["records.insights.title"],
            period: t[`records.glucose.${range}`],
            highestGlucose: t["records.insights.highestGlucose"],
            lowestGlucose: t["records.insights.lowestGlucose"],
            biggestJump: t["records.insights.biggestJump"],
            biggestDecrease: t["records.insights.biggestDecrease"],
            dangerousFoods: t["records.insights.dangerousFoods"],
            noData: t["records.insights.noData"],
            noMeals: t["records.insights.noMeals"],
          }}
        />
      )}
      {showBrief && records !== null && records.length > 0 && (
        <GlucoseChart
          points={glucosePoints}
          range={range}
          onPointClick={openDayForPoint}
          lang={lang}
          labels={{
            title: t["records.glucose.title"],
            empty: t["records.glucose.empty"],
          }}
        />
      )}

      {showFull && (
        <div className="timeline full-report-log">
          {visibleMonthGroups.map((month) => (
            <section key={month.key} className="timeline-month-group">
              {month.days.map((day) => (
                <div key={day.key} className="timeline-day-group">
                  <div className="timeline-day-head">
                    <div className="timeline-day">{calendarDayLabel(day.key, lang)}</div>
                    <button
                      type="button"
                      className="full-day-edit-trigger"
                      onClick={() => setEditingDay(day)}
                    >
                      {t["records.edit"]}
                    </button>
                  </div>
                  {day.entries
                  .flatMap(({ record, events }) =>
                    showFull
                      ? events.map((event) => ({ record, events: [event] }))
                      : [{ record, events }]
                  )
                  .sort((a, b) =>
                    showFull
                      ? (b.events[0]?.ts ?? 0) - (a.events[0]?.ts ?? 0)
                      : 0
                  )
                  .map(({ record, events }, entryIndex) => {
                  return (
                    <div
                      key={`${record._id}-${events[0]?.ts ?? "record"}-${entryIndex}`}
                      className="timeline-entry"
                    >
                      <span className="timeline-dot" aria-hidden="true" />
                      <div className="timeline-content">
                        {!showFull && <div className="record-actions">
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
                            {deleting === record._id
                              ? t["records.deleting"]
                              : t["records.delete"]}
                          </button>
                        </div>}
                  {events.length > 0 ? (
                    <div className="timeline-mixed-events">
                      {events.map((event, index) => {
                        if (event.kind === "reading") {
                          const derived =
                            localizeReadingPhase(event.phase, lang) ??
                            readingPhase(event.time, lang);
                          if (showFull) {
                            return (
                              <div
                                key={`reading-${index}`}
                                className="timeline-full-event"
                              >
                                <span className="timeline-full-title">
                                  {displayMetricName(
                                    event.item.name,
                                    t["records.glucose.label"]
                                  )}
                                  {derived ? ` · ${derived}` : ""}
                                </span>
                                <span className="timeline-reading">
                                  <span className="timeline-reading-main">
                                    {event.item.value ? `${event.item.value}` : "—"}
                                    {event.item.unit ? ` ${event.item.unit}` : ""}
                                  </span>
                                  {event.time && (
                                    <span className="timeline-reading-time">
                                      {displayEventTime(event.time, lang)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <span key={`reading-${index}`} className="timeline-reading">
                              <span className="timeline-reading-main">
                                {displayMetricName(
                                  event.item.name,
                                  t["records.glucose.label"]
                                )}
                                {derived ? ` ${derived}` : ""}
                                {event.item.value ? ` ${event.item.value}` : ""}
                                {event.item.unit ? ` ${event.item.unit}` : ""}
                              </span>
                              {event.time && (
                                <span className="timeline-reading-time">
                                  {displayEventTime(event.time, lang)}
                                </span>
                              )}
                            </span>
                          );
                        }
                        const meal = event.meal;
                        const mealContent = (
                          <>
                            {meal.time && (
                              <span className="meal-time">
                                {displayEventTime(meal.time, lang)}
                              </span>
                            )}
                            {(meal.dishes ?? []).length > 0 ? (
                              <span className="dish-grid">
                                {meal.dishes!.map((dish, dishIndex) => (
                                  <span
                                    key={dishIndex}
                                    className={`dish-box${dish.rank ? ` rank-${rankClass(dish.rank)}` : ""}`}
                                  >
                                    <span className="dish-box-name">{dish.name}</span>
                                    {dish.rank && !showFull && (
                                      <span className="dish-box-rank">{dish.rank}</span>
                                    )}
                                  </span>
                                ))}
                              </span>
                            ) : (
                              meal.foods && <span className="meal-foods">{meal.foods}</span>
                            )}
                          </>
                        );
                        const mealTitle = mealNameForTime(meal.time, lang);
                        return (
                          showFull ? (
                            <div key={`meal-${index}`} className="timeline-full-event">
                              <span className="timeline-full-title">
                                {mealTitle}
                                <RecordImages
                                  imageKeys={record.imageKeys}
                                  unavailableLabel={t["records.imageUnavailable"]}
                                  imageAlt={t["records.imageAlt"]}
                                  buttonLabel={t["records.imageButton"]}
                                  closeLabel={t["records.imageClose"]}
                                />
                              </span>
                              <div className="timeline-meal">{mealContent}</div>
                            </div>
                          ) : (
                            <div key={`meal-${index}`} className="timeline-meal">
                              <span className="meal-name">
                                {mealTitle}
                                <RecordImages
                                  imageKeys={record.imageKeys}
                                  unavailableLabel={t["records.imageUnavailable"]}
                                  imageAlt={t["records.imageAlt"]}
                                  buttonLabel={t["records.imageButton"]}
                                  closeLabel={t["records.imageClose"]}
                                />
                              </span>
                              {mealContent}
                            </div>
                          )
                        );
                      })}
                    </div>
                  ) : (
                    <ul className="conclusion-items">
                      {record.items.map((item, index) => (
                        <li key={index}>
                          <span className="item-name">
                            {displayMetricName(item.name, t["records.glucose.label"])}
                          </span>
                          {item.value && <span className="item-value">{item.value}</span>}
                          {item.unit && <span className="item-unit">{item.unit}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      {showFull && records !== null && (
        <div className="records-timeline-controls">
          {hasMoreTimelineDays && (
            <button
              type="button"
              className="records-timeline-more"
              onClick={() =>
                setTimelineVisibleDays((count) =>
                  Math.min(count + 30, timelineDays.length)
                )
              }
            >
              {t["records.timelineMore"]}
            </button>
          )}
          <div className="records-date-filter">
            <div className="records-date-filter-controls">
              <div className="records-date-picker">
                <button
                  type="button"
                  className="records-date-trigger"
                  onClick={() => setDatePickerOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={datePickerOpen}
                >
                  {selectedDate || t["records.dateFilter"]}
                </button>
              </div>
              {selectedDate && (
                <button type="button" onClick={() => setSelectedDate("")}>
                  {t["records.dateClear"]}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showFull && selectedDate && visibleMonthGroups.length === 0 && (
        <section className="usage-card records-date-empty">
          <span className="usage-title">{t["records.dateEmpty"]}</span>
        </section>
      )}
      {editingDay && (
        <FullDayEditModal
          dayLabel={calendarDayLabel(editingDay.key, lang)}
          records={editingDay.entries.map(({ record }) => record)}
          labels={{
            close: t["actions.cancel"],
          }}
          onClose={() => setEditingDay(null)}
          guest={guest === true}
          onSaved={(record, edited, savedRecordId) => {
            const id = savedRecordId ?? record._id;
            const updated = {
              ...record,
              _id: id,
              title: edited.title,
              summary: edited.summary,
              items: edited.items,
              meals: edited.meals,
            };
            setRecords((prev) =>
              prev?.map((current) => (current._id === record._id ? updated : current)) ??
              null
            );
            setEditingDay((day) =>
              day
                ? {
                    ...day,
                    entries: day.entries.map((entry) =>
                      entry.record._id === record._id
                        ? { ...entry, record: updated }
                        : entry
                    ),
                  }
                : null
            );
            setError(null);
          }}
        />
      )}
      {editingRecord && (
        showFull ? (
          <ConcludeModal
            open
            result={editingResult}
            sourceText={editingRecord.sourceText ?? ""}
            guest={guest === true}
            recordId={editingRecord._id}
            sessionId={editingRecord.sessionId}
            imageKeys={editingRecord.imageKeys}
            onClose={() => setEditingRecord(null)}
            onSaved={(edited, savedRecordId) => {
              const id = savedRecordId ?? editingRecord._id;
              setRecords((prev) =>
                prev?.map((record) =>
                  record._id === editingRecord._id
                    ? {
                        ...record,
                        _id: id,
                        title: edited.title,
                        summary: edited.summary,
                        items: edited.items,
                        meals: edited.meals,
                      }
                    : record
                ) ?? null
              );
              setError(null);
            }}
          />
        ) : (
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
        )
      )}
    </div>
  );
}
