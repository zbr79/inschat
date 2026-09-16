"use client";

import { ChevronDown } from "lucide-react";
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
      <select
        className="records-range-select"
        aria-label={labels.range}
        value={range}
        onChange={(event) =>
          onRangeChange(event.target.value as TimelineRange)
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="records-range-chevron"
        size={16}
        strokeWidth={2.25}
        aria-hidden="true"
      />
    </div>
  );
}
