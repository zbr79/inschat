"use client";

import { useState } from "react";
import {
  timelineBounds,
  type GlucosePoint,
  type TimelineRange,
} from "@/lib/recordTimeline";

type ChartType = "bar" | "line";
type ViewMode = "timeline" | "daily";

interface GlucoseChartProps {
  points: GlucosePoint[];
  range: TimelineRange;
  onRangeChange: (range: TimelineRange) => void;
  labels: {
    title: string;
    subtitle: string;
    range: string;
    day: string;
    week: string;
    quarter: string;
    year: string;
    all: string;
    empty: string;
    bar: string;
    line: string;
    timeline: string;
    daily: string;
  };
  lang: "zh" | "en";
}

const WIDTH = 720;
const HEIGHT = 280;
const PADDING = { top: 24, right: 24, bottom: 42, left: 44 };

function formatDate(ts: number, lang: "zh" | "en"): string {
  return new Date(ts).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function GlucoseChart({
  points,
  range,
  onRangeChange,
  labels,
  lang,
}: GlucoseChartProps) {
  const [chartType, setChartType] = useState<ChartType>("line");
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const values = points.map((point) => point.value);
  const rawMax = values.length ? Math.max(...values) : 100;
  const min = 0;
  const max = Math.max(100, rawMax * 1.15);
  const bounds = timelineBounds(range, points);
  const timeSpan = Math.max(1, bounds.end - bounds.start);
  const x = (ts: number) => {
    if (bounds.start === bounds.end) return PADDING.left + innerWidth / 2;
    return PADDING.left + ((ts - bounds.start) / timeSpan) * innerWidth;
  };
  const y = (value: number) =>
    PADDING.top + ((max - value) / (max - min)) * innerHeight;
  const baseline = y(0);
  const barWidth = Math.min(18, Math.max(2, (innerWidth / Math.max(points.length, 1)) * 0.72));
  const showBarValues = points.length <= 40;
  const gridValues = [max, max / 2, 0];
  const linePoints = points.map((point) => `${x(point.ts)},${y(point.value)}`).join(" ");
  const dailyGroups = Array.from(
    points.reduce((groups, point) => {
      const date = new Date(point.ts);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const group = groups.get(key) ?? [];
      group.push(point);
      groups.set(key, group);
      return groups;
    }, new Map<string, GlucosePoint[]>()).values()
  );
  const dailyX = (ts: number) => {
    const date = new Date(ts);
    const minutes =
      date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
    return PADDING.left + (minutes / 1440) * innerWidth;
  };
  const formatHour = (hour: number) =>
    lang === "zh"
      ? `${hour}:00`
      : new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", {
          hour: "numeric",
        });

  return (
    <section className="usage-card glucose-chart-card">
      <div className="glucose-chart-head">
        <div>
          <h3>{labels.title}</h3>
          <p>{labels.subtitle}</p>
        </div>
        <div className="glucose-chart-controls">
          <div className="glucose-chart-types" role="group" aria-label={labels.title}>
            <button
              type="button"
              className={viewMode === "timeline" ? "active" : ""}
              aria-pressed={viewMode === "timeline"}
              onClick={() => setViewMode("timeline")}
            >
              {labels.timeline}
            </button>
            <button
              type="button"
              className={viewMode === "daily" ? "active" : ""}
              aria-pressed={viewMode === "daily"}
              onClick={() => setViewMode("daily")}
            >
              {labels.daily}
            </button>
          </div>
          {viewMode === "timeline" && (
            <div className="glucose-chart-types" role="group" aria-label={labels.title}>
            <button
              type="button"
              className={chartType === "bar" ? "active" : ""}
              aria-pressed={chartType === "bar"}
              onClick={() => setChartType("bar")}
            >
              {labels.bar}
            </button>
            <button
              type="button"
              className={chartType === "line" ? "active" : ""}
              aria-pressed={chartType === "line"}
              onClick={() => setChartType("line")}
            >
              {labels.line}
            </button>
            </div>
          )}
          <label className="glucose-range">
            <span>{labels.range}</span>
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
      </div>

      {points.length === 0 ? (
        <p className="glucose-chart-empty">{labels.empty}</p>
      ) : (
        <div className="glucose-chart-frame">
          <svg
            className="glucose-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${labels.title}: ${points.length} ${labels.subtitle}`}
          >
            {gridValues.map((value) => (
              <g key={value}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y(value)}
                  y2={y(value)}
                  className="glucose-grid-line"
                />
                <text x={PADDING.left - 8} y={y(value) + 4} textAnchor="end">
                  {Math.round(value)}
                </text>
              </g>
            ))}
            {viewMode === "daily" ? (
              <>
                {dailyGroups.map((dayPoints, index) => (
                  <g key={dayPoints[0]?.id ?? index}>
                    {dayPoints.length > 1 && (
                      <polyline
                        points={dayPoints
                          .map((point) => `${dailyX(point.ts)},${y(point.value)}`)
                          .join(" ")}
                        className="glucose-daily-line"
                      />
                    )}
                    {dayPoints.map((point) => (
                      <circle
                        key={point.id}
                        cx={dailyX(point.ts)}
                        cy={y(point.value)}
                        r="3.5"
                        className="glucose-point"
                      >
                        <title>
                          {point.value}
                          {point.unit ? ` ${point.unit}` : ""} ·{" "}
                          {new Date(point.ts).toLocaleString(
                            lang === "zh" ? "zh-CN" : "en-US"
                          )}
                        </title>
                      </circle>
                    ))}
                  </g>
                ))}
                {[0, 6, 12, 18, 24].map((hour) => (
                  <text
                    key={hour}
                    x={PADDING.left + (hour / 24) * innerWidth}
                    y={HEIGHT - 12}
                    textAnchor={hour === 0 ? "start" : hour === 24 ? "end" : "middle"}
                  >
                    {formatHour(hour === 24 ? 0 : hour)}
                  </text>
                ))}
              </>
            ) : chartType === "line" ? (
              <>
                <polyline points={linePoints} className="glucose-line" />
                {points.map((point) => (
                  <circle
                    key={point.id}
                    cx={x(point.ts)}
                    cy={y(point.value)}
                    r="4"
                    className="glucose-point"
                  >
                    <title>
                      {point.value}
                      {point.unit ? ` ${point.unit}` : ""} ·{" "}
                      {new Date(point.ts).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
                    </title>
                  </circle>
                ))}
              </>
            ) : (
              <>
                {points.map((point) => (
                  <g key={point.id}>
                    <rect
                      x={x(point.ts) - barWidth / 2}
                      y={y(point.value)}
                      width={barWidth}
                      height={Math.max(1, baseline - y(point.value))}
                      rx="4"
                      className="glucose-bar"
                    />
                    {showBarValues && (
                      <text
                        x={x(point.ts)}
                        y={y(point.value) - 8}
                        textAnchor="middle"
                        className="glucose-bar-value"
                      >
                        {point.value}
                      </text>
                    )}
                    <title>
                      {point.value}
                      {point.unit ? ` ${point.unit}` : ""} ·{" "}
                      {new Date(point.ts).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
                    </title>
                  </g>
                ))}
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={baseline}
                  y2={baseline}
                  className="glucose-baseline"
                />
              </>
            )}
            {viewMode === "timeline" && (
              <>
                <text x={PADDING.left} y={HEIGHT - 12}>
                  {formatDate(bounds.start, lang)}
                </text>
                <text x={WIDTH - PADDING.right} y={HEIGHT - 12} textAnchor="end">
                  {formatDate(bounds.end, lang)}
                </text>
              </>
            )}
          </svg>
        </div>
      )}
    </section>
  );
}
