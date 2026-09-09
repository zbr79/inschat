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
  return (
    <div className="records-range-control">
      <label className="glucose-range">
        <select
          value={range}
          aria-label={labels.range}
          onChange={(event) => onRangeChange(event.target.value as TimelineRange)}
        >
          <option value="day">{labels.day}</option>
          <option value="week">{labels.week}</option>
          <option value="quarter">{labels.quarter}</option>
          <option value="year">{labels.year}</option>
          <option value="all">{labels.all}</option>
        </select>
      </label>
    </div>
  );
}
