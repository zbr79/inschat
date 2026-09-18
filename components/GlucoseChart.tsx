"use client";

import { useState } from "react";
import {
  timelineBounds,
  type GlucosePoint,
  type TimelineRange,
} from "@/lib/recordTimeline";

interface GlucoseChartProps {
  points: GlucosePoint[];
  range: TimelineRange;
  onPointClick: (point: GlucosePoint) => void;
  labels: {
    title: string;
    empty: string;
  };
  lang: "zh" | "en";
}

const WIDTH = 720;
const HEIGHT = 280;
const PADDING = { top: 24, right: 24, bottom: 42, left: 44 };
const DAY_MS = 24 * 60 * 60 * 1000;

function axisTickCount(range: TimelineRange): number {
  if (range === "day" || range === "week") return 5;
  if (range === "quarter") return 4;
  if (range === "year") return 5;
  return 6;
}

function axisTickTimestamps(
  start: number,
  end: number,
  range: TimelineRange
): number[] {
  const count = axisTickCount(range);
  if (start === end) return [start];
  return Array.from({ length: count }, (_, index) => {
    const fraction = index / (count - 1);
    return start + (end - start) * fraction;
  });
}

function formatAxisTick(ts: number, span: number, lang: "zh" | "en"): string {
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  if (span <= 2 * DAY_MS) {
    return new Date(ts).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const date = new Date(ts);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function pointLabel(point: GlucosePoint, lang: "zh" | "en"): string {
  return `${point.value}${point.unit ? ` ${point.unit}` : ""} · ${new Date(
    point.ts
  ).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}`;
}

export default function GlucoseChart({
  points,
  range,
  onPointClick,
  labels,
  lang,
}: GlucoseChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<GlucosePoint | null>(null);
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
  const gridValues = [max, max / 2, 0];
  const linePoints = points.map((point) => `${x(point.ts)},${y(point.value)}`).join(" ");
  const axisTicks = axisTickTimestamps(bounds.start, bounds.end, range);

  return (
    <section className="usage-card glucose-chart-card">
      <div className="glucose-chart-head">
        <div>
          <h3>{labels.title}</h3>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="glucose-chart-empty">{labels.empty}</p>
      ) : (
        <div className="glucose-chart-frame">
          {hoveredPoint && (
            <div
              className="glucose-chart-tooltip"
              role="status"
              style={{
                left: `${(x(hoveredPoint.ts) / WIDTH) * 100}%`,
                top: `${(y(hoveredPoint.value) / HEIGHT) * 100}%`,
              }}
            >
              <strong>
                {hoveredPoint.value}
                {hoveredPoint.unit ? ` ${hoveredPoint.unit}` : ""}
              </strong>
              <span>
                {new Date(hoveredPoint.ts).toLocaleString(
                  lang === "zh" ? "zh-CN" : "en-US"
                )}
              </span>
            </div>
          )}
          <svg
            className="glucose-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`${labels.title}: ${points.length}`}
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
            <polyline points={linePoints} className="glucose-line" />
            {points.map((point) => (
              <circle
                key={point.id}
                cx={x(point.ts)}
                cy={y(point.value)}
                r="10"
                className="glucose-hover-target"
                tabIndex={0}
                role="img"
                aria-label={pointLabel(point, lang)}
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onFocus={() => setHoveredPoint(point)}
                onBlur={() => setHoveredPoint(null)}
                onClick={() => onPointClick(point)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPointClick(point);
                  }
                }}
              >
              </circle>
            ))}
            {axisTicks.map((ts, index) => (
              <g key={ts}>
                <line
                  x1={x(ts)}
                  x2={x(ts)}
                  y1={HEIGHT - PADDING.bottom}
                  y2={HEIGHT - PADDING.bottom + 4}
                  className="glucose-axis-tick"
                />
                <text
                  x={x(ts)}
                  y={HEIGHT - 12}
                  textAnchor={
                    index === 0
                      ? "start"
                      : index === axisTicks.length - 1
                        ? "end"
                        : "middle"
                  }
                >
                  {formatAxisTick(ts, timeSpan, lang)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}
