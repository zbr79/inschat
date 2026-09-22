"use client";

import { useEffect } from "react";
import { applyThemeMode, getThemeMode } from "@/lib/prefs";

export default function ThemeMode() {
  useEffect(() => {
    const update = () => applyThemeMode(getThemeMode());
    const onTheme = () => update();
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    update();
    window.addEventListener("inschat-theme", onTheme);
    media.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("inschat-theme", onTheme);
      media.removeEventListener?.("change", update);
    };
  }, []);

  return null;
}
