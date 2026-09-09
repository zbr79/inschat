"use client";

import type { TimelineRange } from "@/lib/recordTimeline";

interface GlucoseRangeControlProps {
  range: TimelineRange;
  onRangeChange: (range: TimelineRange) => void;
  labels: {
    range: string;
    day: string;
    week: string;
    quarter: string;
    year: string;
    all: string;
  };
}

export default function GlucoseRangeControl({
  range,
  onRangeChange,
  labels,
}: GlucoseRangeControlProps) {
  const options: Array<{ value: TimelineRange; label: string }> = [
    { value: "day", label: labels.day },
    { value: "week", label: labels.week },
    { value: "quarter", label: labels.quarter },
    { value: "year", label: labels.year },
    { value: "all", label: labels.all },
  ];

  return (
    <div className="records-range-control">
      <div className="records-range-tabs" role="tablist" aria-label={labels.range}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={range === option.value}
            className={range === option.value ? "active" : ""}
            onClick={() => onRangeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
