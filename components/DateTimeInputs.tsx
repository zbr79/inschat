"use client";

import { useState } from "react";
import { formatDateTimeDisplay, parseFlexibleDateTime } from "@/lib/mealTime";

export default function DateTimeInputs({
  value,
  lang,
  t,
  onDisplay,
}: {
  value: string | undefined;
  lang: "zh" | "en";
  t: Record<string, string>;
  onDisplay: (display: string) => void;
}) {
  const parsed = parseFlexibleDateTime(value ?? "");
  const [date, setDate] = useState(parsed?.date ?? "");
  const [time, setTime] = useState(parsed?.time ?? "");

  const commit = (nextDate: string, nextTime: string) => {
    const display = formatDateTimeDisplay(nextDate, nextTime, lang);
    if (display) onDisplay(display);
  };

  return (
    <div className="conclude-time-row">
      <input
        type="time"
        className="conclude-time-input"
        value={time}
        onChange={(event) => {
          setTime(event.target.value);
          commit(date, event.target.value);
        }}
        aria-label={t["concludeModal.time"]}
      />
      <input
        type="date"
        className="conclude-time-input"
        value={date}
        onChange={(event) => {
          setDate(event.target.value);
          commit(event.target.value, time);
        }}
        aria-label={t["concludeModal.date"]}
      />
    </div>
  );
}
