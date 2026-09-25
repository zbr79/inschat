"use client";

import { useEffect, useState } from "react";
import { addDemoGlucoseRecords, clearGuestData } from "@/lib/guestStore";
import { clearGuestImages } from "@/lib/guestImages";

const DEMO_INIT_KEY = "inschat_guest_demo_initialized";
const HEALTH_INTRO_KEY = "inschat_health_intro_seen";
const HEALTH_INTRO_EVENT = "inschat-health-intro";
const HEALTH_INTRO_REQUEST_EVENT = "inschat-health-intro-request";

export function initializeGuestDemoData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(DEMO_INIT_KEY) === "1") return false;
    const count = addDemoGlucoseRecords(30);
    window.localStorage.setItem(DEMO_INIT_KEY, "1");
    window.dispatchEvent(new CustomEvent("inschat-records-changed"));
    return count > 0;
  } catch {
    return false;
  }
}

export function getHealthIntroSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(HEALTH_INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function setHealthIntroSeen(seen: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HEALTH_INTRO_KEY, seen ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent(HEALTH_INTRO_EVENT, { detail: seen }));
}

export function requestHealthIntro(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(HEALTH_INTRO_REQUEST_EVENT));
}

export function resetGuestDataForFreshVisit(): void {
  if (typeof window === "undefined") return;
  clearGuestData();
  void clearGuestImages();
  addDemoGlucoseRecords(30);
  try {
    window.localStorage.setItem(DEMO_INIT_KEY, "1");
  } catch {}
  setHealthIntroSeen(false);
  window.dispatchEvent(new CustomEvent("inschat-records-changed"));
}

export function useHealthIntroSeen(): boolean {
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    setSeen(getHealthIntroSeen());
    const onChange = (event: Event) => {
      setSeen(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(HEALTH_INTRO_EVENT, onChange);
    return () => window.removeEventListener(HEALTH_INTRO_EVENT, onChange);
  }, []);
  return seen;
}
