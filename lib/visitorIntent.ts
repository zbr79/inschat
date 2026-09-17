"use client";

import { useEffect, useState } from "react";
import { addDemoGlucoseRecords } from "@/lib/guestStore";
import { setHealthMode } from "@/lib/prefs";

export type VisitorIntent = "chat" | "glucose" | "review";

const INTENT_KEY = "inschat_visitor_intent";
const INTENT_EVENT = "inschat-visitor-intent";
const COACH_KEY = "inschat_review_coach_done";
const COACH_EVENT = "inschat-review-coach";

function isVisitorIntent(value: string | null): value is VisitorIntent {
  return value === "chat" || value === "glucose" || value === "review";
}

export function getVisitorIntent(): VisitorIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(INTENT_KEY);
    return isVisitorIntent(value) ? value : null;
  } catch {
    return null;
  }
}

export function setVisitorIntent(intent: VisitorIntent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INTENT_KEY, intent);
  } catch {}
  window.dispatchEvent(new CustomEvent(INTENT_EVENT, { detail: intent }));
}

export function applyVisitorChoice(intent: VisitorIntent): string {
  setVisitorIntent(intent);
  if (intent === "chat") return "/?newMode=general";
  setHealthMode(true);
  if (intent === "glucose") return "/?newMode=health";
  addDemoGlucoseRecords(30);
  window.dispatchEvent(new CustomEvent("inschat-records-changed"));
  setReviewCoachDone(false);
  return "/records";
}

export function useVisitorIntent(): {
  ready: boolean;
  intent: VisitorIntent | null;
} {
  const [ready, setReady] = useState(false);
  const [intent, setIntent] = useState<VisitorIntent | null>(null);
  useEffect(() => {
    setIntent(getVisitorIntent());
    setReady(true);
    const onChange = (event: Event) => {
      setIntent((event as CustomEvent<VisitorIntent>).detail);
    };
    window.addEventListener(INTENT_EVENT, onChange);
    return () => window.removeEventListener(INTENT_EVENT, onChange);
  }, []);
  return { ready, intent };
}

export function getReviewCoachDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(COACH_KEY) === "1";
  } catch {
    return true;
  }
}

export function setReviewCoachDone(done: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COACH_KEY, done ? "1" : "0");
  } catch {}
  window.dispatchEvent(new CustomEvent(COACH_EVENT, { detail: done }));
}

export function useReviewCoachDone(): boolean {
  const [done, setDone] = useState(true);
  useEffect(() => {
    setDone(getReviewCoachDone());
    const onChange = (event: Event) => {
      setDone(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(COACH_EVENT, onChange);
    return () => window.removeEventListener(COACH_EVENT, onChange);
  }, []);
  return done;
}
