"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface DatePickerModalProps {
  open: boolean;
  value: string;
  locale: "en-US" | "zh-CN";
  recordCounts: Record<string, number>;
  labels: {
    title: string;
    cancel: string;
    today: string;
  };
  onClose: () => void;
  onSelect: (value: string) => void;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function DatePickerModal({
  open,
  value,
  locale,
  recordCounts,
  labels,
  onClose,
  onSelect,
}: DatePickerModalProps) {
  const selectedDate = dateFromKey(value);
  const [displayedMonth, setDisplayedMonth] = useState(
    () => selectedDate ?? new Date()
  );

  useEffect(() => {
    if (!open) return;
    setDisplayedMonth(selectedDate ?? new Date());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, value]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(displayedMonth),
    [displayedMonth, locale]
  );
  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, index) =>
      formatter.format(new Date(2024, 0, 7 + index))
    );
  }, [locale]);
  const days = useMemo(() => {
    const firstDay = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth(),
      1
    ).getDay();
    const daysInMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() + 1,
      0
    ).getDate();
    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [displayedMonth]);

  if (!open) return null;

  const moveMonth = (offset: number) => {
    setDisplayedMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  };
  const selectDate = (day: number) => {
    const date = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth(),
      day
    );
    onSelect(dateKey(date));
    onClose();
  };
  const selectToday = () => {
    const today = new Date();
    onSelect(dateKey(today));
    onClose();
  };

  return (
    <div
      className="date-picker-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="date-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="date-picker-title"
      >
        <div className="date-picker-modal-head">
          <h3 id="date-picker-title">{labels.title}</h3>
          <button
            type="button"
            className="date-picker-close"
            onClick={onClose}
            aria-label={labels.cancel}
            autoFocus
          >
            <X size={19} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="date-picker-month-nav">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            aria-label={locale === "zh-CN" ? "上个月" : "Previous month"}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <strong>{monthLabel}</strong>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            aria-label={locale === "zh-CN" ? "下个月" : "Next month"}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="date-picker-weekdays" aria-hidden="true">
          {weekdays.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="date-picker-grid">
          {days.map((day, index) =>
            day === null ? (
              <span key={`empty-${index}`} aria-hidden="true" />
            ) : (
              (() => {
                const date = new Date(
                  displayedMonth.getFullYear(),
                  displayedMonth.getMonth(),
                  day
                );
                const key = dateKey(date);
                const recordCount = recordCounts[key] ?? 0;
                const dateLabel = new Intl.DateTimeFormat(locale, {
                  dateStyle: "full",
                }).format(date);
                const countLabel =
                  locale === "zh-CN"
                    ? `，${recordCount} 条记录`
                    : `, ${recordCount} record${recordCount === 1 ? "" : "s"}`;
                return (
                  <button
                    key={day}
                    type="button"
                    className={[
                      key === value ? "selected" : "",
                      recordCount > 0 ? "has-records" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={`${dateLabel}${recordCount > 0 ? countLabel : ""}`}
                    onClick={() => selectDate(day)}
                  >
                    {day}
                  </button>
                );
              })()
            )
          )}
        </div>
        <div className="date-picker-modal-foot">
          <button type="button" className="date-picker-today" onClick={selectToday}>
            {labels.today}
          </button>
          <button type="button" className="date-picker-cancel" onClick={onClose}>
            {labels.cancel}
          </button>
        </div>
      </section>
    </div>
  );
}
