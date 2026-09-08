"use client";

import type { ChatImage, ConcludeItem, ConcludeMeal, SessionConclusion } from "./types";

export interface GuestMessage {
  role: "user" | "model";
  text: string;
  images?: ChatImage[];
  imageKeys?: string[];
  model?: string;
  elapsed?: number;
}

export interface GuestSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: GuestMessage[];
  pinned?: boolean;
  conclusion?: SessionConclusion | null;
  recordId?: string | null;
}

export interface GuestRecord {
  id: string;
  title: string;
  summary: string;
  items: ConcludeItem[];
  meals?: ConcludeMeal[];
  sourceText?: string;
  savedAt: string;
  recordedAt?: string;
  sessionId?: string;
  pinned?: boolean;
}

const SESSIONS_KEY = "inschat_guest_sessions";
const RECORDS_KEY = "inschat_guest_records";
const REPORT_KEY = "inschat_guest_report";
export const DEMO_RECORD_PREFIX = "demo-glucose-";

interface GuestReport {
  version: 1;
  updatedAt: string;
  entries: GuestRecord[];
}

function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function writeSessions(sessions: GuestSession[]): void {
  if (writeJson(SESSIONS_KEY, sessions)) return;
  // Quota exceeded: drop images everywhere, then shrink the list, then give up.
  const withoutImages = sessions.map((session) => ({
    ...session,
    messages: session.messages.map((message) => ({ ...message, images: undefined })),
  }));
  if (writeJson(SESSIONS_KEY, withoutImages)) return;
  writeJson(SESSIONS_KEY, withoutImages.slice(-10));
}

export function listGuestSessions(): GuestSession[] {
  return readJson<GuestSession[]>(SESSIONS_KEY, []).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}

export function getGuestSession(id: string): GuestSession | null {
  return readJson<GuestSession[]>(SESSIONS_KEY, []).find((s) => s.id === id) ?? null;
}

export function createGuestSession(title: string): GuestSession {
  const session: GuestSession = {
    id: newId(),
    title,
    updatedAt: Date.now(),
    messages: [],
  };
  writeSessions([session, ...readJson<GuestSession[]>(SESSIONS_KEY, [])]);
  return session;
}

export function appendGuestMessage(sessionId: string, message: GuestMessage): void {
  const sessions = readJson<GuestSession[]>(SESSIONS_KEY, []);
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) return;
  target.messages.push(message);
  target.updatedAt = Date.now();
  writeSessions(sessions);
}

export function setGuestConclusion(
  sessionId: string,
  conclusion: SessionConclusion | null,
  recordId?: string | null
): void {
  const sessions = readJson<GuestSession[]>(SESSIONS_KEY, []);
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) return;
  target.conclusion = conclusion ?? null;
  if (recordId !== undefined) target.recordId = recordId ?? null;
  target.updatedAt = Date.now();
  writeSessions(sessions);
}

export function renameGuestSession(sessionId: string, title: string): void {
  const sessions = readJson<GuestSession[]>(SESSIONS_KEY, []);
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) return;
  target.title = title;
  target.updatedAt = Date.now();
  writeSessions(sessions);
}

export function pinGuestSession(sessionId: string, pinned: boolean): void {
  const sessions = readJson<GuestSession[]>(SESSIONS_KEY, []);
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) return;
  target.pinned = pinned;
  target.updatedAt = Date.now();
  writeSessions(sessions);
}

export function truncateGuestSession(sessionId: string, keep: number): void {
  const sessions = readJson<GuestSession[]>(SESSIONS_KEY, []);
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) return;
  target.messages = target.messages.slice(0, keep);
  target.conclusion = null;
  target.updatedAt = Date.now();
  writeSessions(sessions);
}

export function deleteGuestSession(id: string): void {
  writeSessions(
    readJson<GuestSession[]>(SESSIONS_KEY, []).filter((session) => session.id !== id)
  );
}

export function clearGuestSessions(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSIONS_KEY);
  } catch {}
}

export function clearGuestData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSIONS_KEY);
    window.localStorage.removeItem(RECORDS_KEY);
    window.localStorage.removeItem(REPORT_KEY);
  } catch {}
}

function readGuestReport(): GuestReport {
  const current = readJson<GuestReport | null>(REPORT_KEY, null);
  if (current?.version === 1 && Array.isArray(current.entries)) return current;

  const legacy = readJson<GuestRecord[]>(RECORDS_KEY, []);
  const migrated: GuestReport = {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: legacy.map((record) => ({
      ...record,
      recordedAt: record.recordedAt ?? record.savedAt,
    })),
  };
  if (legacy.length > 0) writeJson(REPORT_KEY, migrated);
  return migrated;
}

function writeGuestReport(entries: GuestRecord[]): boolean {
  return writeJson(REPORT_KEY, {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries,
  } satisfies GuestReport);
}

export function listGuestRecords(): GuestRecord[] {
  return readGuestReport().entries.sort(
    (a, b) =>
      Number(b.pinned ?? false) - Number(a.pinned ?? false) ||
      (b.recordedAt ?? b.savedAt).localeCompare(a.recordedAt ?? a.savedAt)
  );
}

function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function demoRecordContent(date: Date, dayIndex: number): {
  items: ConcludeItem[];
  meals: ConcludeMeal[];
} {
  const key = localDateKey(date);
  const wave = Math.sin(dayIndex * 0.62) * 8 + Math.cos(dayIndex * 0.19) * 4;
  const items: ConcludeItem[] = [];
  const addReading = (
    hour: string,
    glucose: number,
    insulin: number,
    phase: string
  ) => {
    items.push(
      { name: "insulin", value: String(Math.round(insulin)), unit: "mg/dL" },
      { name: "phase", value: phase },
      { name: "time", value: `${key} ${hour}` },
      { name: "glucose", value: String(Math.round(glucose)), unit: "mg/dL" },
      { name: "phase", value: phase },
      { name: "time", value: `${key} ${hour}` }
    );
  };

  const meals: ConcludeMeal[] = [
    {
      name: "",
      time: `${key} 07:30`,
      dishes: (dayIndex % 2 === 0
        ? ["Oatmeal", "Egg"]
        : ["Toast"]
      ).map((name) => ({ name, rank: "medium" })),
    },
    {
      name: "",
      time: `${key} 12:15`,
      dishes: (dayIndex % 2 === 0
        ? ["Rice bowl", "Chicken"]
        : ["Noodles", "Vegetables", "Fruit"]
      ).map((name) => ({ name, rank: "medium" })),
    },
    {
      name: "",
      time: `${key} 18:45`,
      dishes: (dayIndex % 2 === 0
        ? ["Soup", "Fish", "Greens"]
        : ["Rice", "Chicken", "Salad", "Fruit"]
      ).map((name) => ({ name, rank: "medium" })),
    },
  ];

  addReading("07:30", 94 + wave, 96 + wave * 0.6, "before breakfast");
  addReading("12:15", 108 + wave * 0.8, 103 + wave * 0.4, "before lunch");
  addReading("18:45", 118 + wave * 1.1, 112 + wave * 0.7, "before dinner");

  if (dayIndex % 3 === 0) {
    meals.push({
      name: "",
      time: `${key} 15:45`,
      dishes: [{ name: "Yogurt", rank: "low" }, { name: "Nuts", rank: "low" }],
    });
    addReading("15:45", 126 + wave * 0.5, 108 + wave * 0.4, "afternoon");
  }
  if (dayIndex % 7 === 5) {
    meals.push({
      name: "",
      time: `${key} 23:00`,
      dishes: [{ name: "Milk", rank: "low" }],
    });
    addReading("23:00", 132 + wave * 0.4, 116 + wave * 0.4, "late night");
  }

  return { items, meals };
}

export function addDemoGlucoseRecords(days = 30): number {
  if (typeof window === "undefined") return 0;
  const safeDays = Math.max(1, Math.min(days, 180));
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const demoRecords: GuestRecord[] = [];
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = localDateKey(date);
    const content = demoRecordContent(date, safeDays - 1 - offset);
    demoRecords.push({
      id: `${DEMO_RECORD_PREFIX}${dateKey}`,
      title: `Demo daily report · ${dateKey}`,
      summary: "Synthetic one-month report with meals, glucose, insulin, and timestamps.",
      items: content.items,
      meals: content.meals,
      savedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59).toISOString(),
      recordedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 30).toISOString(),
      pinned: false,
    });
  }
  const records = readGuestReport().entries.filter(
    (record) => !record.id.startsWith(DEMO_RECORD_PREFIX)
  );
  return writeGuestReport([...demoRecords, ...records]) ? demoRecords.length : 0;
}

export function removeDemoGlucoseRecords(): number {
  if (typeof window === "undefined") return 0;
  const records = readGuestReport().entries;
  const remaining = records.filter((record) => !record.id.startsWith(DEMO_RECORD_PREFIX));
  const removed = records.length - remaining.length;
  writeGuestReport(remaining);
  return removed;
}

export function addGuestRecord(input: {
  title: string;
  summary: string;
  items: ConcludeItem[];
  meals?: ConcludeMeal[];
  sourceText?: string;
  sessionId?: string;
  recordedAt?: string;
}): GuestRecord {
  const now = new Date().toISOString();
  const record: GuestRecord = {
    ...input,
    id: newId(),
    savedAt: now,
    recordedAt: input.recordedAt ?? now,
    pinned: false,
  };
  const records = readGuestReport().entries;
  if (writeGuestReport([record, ...records])) return record;
  const slim = [record, ...records].map((r, index) =>
    index > 20 ? { ...r, sourceText: undefined } : r
  );
  writeGuestReport(slim);
  return record;
}

export function deleteGuestRecord(id: string): void {
  writeGuestReport(readGuestReport().entries.filter((record) => record.id !== id));
}

export function updateGuestRecord(
  id: string,
  patch: {
    title: string;
    summary: string;
    items: ConcludeItem[];
    meals?: ConcludeMeal[];
    sourceText?: string;
    sessionId?: string;
    recordedAt?: string;
    pinned?: boolean;
  }
): void {
  writeGuestReport(
    readGuestReport().entries.map((record) =>
      record.id === id
        ? {
            ...record,
            ...patch,
            recordedAt: patch.recordedAt ?? record.recordedAt,
            sessionId: patch.sessionId ?? record.sessionId,
          }
        : record
    )
  );
}
