"use client";

import { useEffect, useState } from "react";
import type { TimelineRange } from "./recordTimeline";

const COMPRESS_KEY = "inschat_compress_images";
const COMPRESS_EVENT = "inschat-compress-images";

// Image compression is ON by default: photos are downscaled to 1600px and
// re-encoded as JPEG q85 before upload (huge input-token savings; reading
// accuracy stays intact at these settings). Toggle off to compare.
export function getCompressImages(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(COMPRESS_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setCompressImages(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPRESS_KEY, on ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent(COMPRESS_EVENT, { detail: on }));
}

export function useCompressImages(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => getCompressImages());
  useEffect(() => {
    const handler = (event: Event) => {
      setOn(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(COMPRESS_EVENT, handler);
    return () => window.removeEventListener(COMPRESS_EVENT, handler);
  }, []);
  return [on, setCompressImages];
}

const HEALTH_MODE_KEY = "inschat_health_mode";
const HEALTH_MODE_EVENT = "inschat-health-mode";

// Keep the feature visible by default so existing users keep seeing their
// Health chats and Records until they explicitly turn it off.
export function getHealthMode(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HEALTH_MODE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setHealthMode(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HEALTH_MODE_KEY, on ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent(HEALTH_MODE_EVENT, { detail: on }));
}

export function useHealthMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => getHealthMode());
  useEffect(() => {
    const handler = (event: Event) => {
      setOn(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(HEALTH_MODE_EVENT, handler);
    return () => window.removeEventListener(HEALTH_MODE_EVENT, handler);
  }, []);
  return [on, setHealthMode];
}

const GLUCOSE_RANGE_KEY = "inschat_glucose_range";

function isTimelineRange(value: string | null): value is TimelineRange {
  return (
    value === "day" ||
    value === "week" ||
    value === "quarter" ||
    value === "year" ||
    value === "all"
  );
}

export function getGlucoseRange(): TimelineRange | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(GLUCOSE_RANGE_KEY);
    return isTimelineRange(value) ? value : null;
  } catch {
    return null;
  }
}

export function setGlucoseRange(range: TimelineRange): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GLUCOSE_RANGE_KEY, range);
  } catch {}
}

export type ThemeMode = "system" | "light" | "dark";

const THEME_KEY = "inschat_theme";
const THEME_EVENT = "inschat-theme";

export function getThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {}
  return "system";
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const systemDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && systemDark);
  document.documentElement.classList.toggle("dark-mode", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function setThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    if (mode === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, mode);
  } catch {}
  applyThemeMode(mode);
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: mode }));
}

export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());
  useEffect(() => {
    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      setMode(next);
      applyThemeMode(next);
    };
    window.addEventListener(THEME_EVENT, onTheme);
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, []);
  return [mode, setThemeMode];
}
