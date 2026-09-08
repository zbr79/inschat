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
  pinned?: boolean;
}

const SESSIONS_KEY = "inschat_guest_sessions";
const RECORDS_KEY = "inschat_guest_records";
export const DEMO_RECORD_PREFIX = "demo-glucose-";

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
  } catch {}
}

export function listGuestRecords(): GuestRecord[] {
  return readJson<GuestRecord[]>(RECORDS_KEY, []).sort(
    (a, b) =>
      Number(b.pinned ?? false) - Number(a.pinned ?? false) ||
      b.savedAt.localeCompare(a.savedAt)
  );
}

function localDateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function demoReadingItems(date: Date, dayIndex: number): ConcludeItem[] {
  const key = localDateKey(date);
  const wave = Math.sin(dayIndex * 0.62) * 8 + Math.cos(dayIndex * 0.19) * 4;
  const readings = [
    { hour: "07:30", value: 92 + wave },
    { hour: "09:15", value: 128 + wave * 1.25 },
    { hour: "15:30", value: 104 - wave * 0.65 },
    { hour: "17:30", value: 142 + wave * 1.4 },
  ];
  return readings.flatMap(({ hour, value }) => [
    { name: "glucose", value: String(Math.round(value)), unit: "mg/dL" },
    { name: "time", value: `${key} ${hour}` },
  ]);
}

export function addDemoGlucoseRecords(days = 60): number {
  if (typeof window === "undefined") return 0;
  const safeDays = Math.max(1, Math.min(days, 180));
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const demoRecords: GuestRecord[] = [];
  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = localDateKey(date);
    demoRecords.push({
      id: `${DEMO_RECORD_PREFIX}${dateKey}`,
      title: `Demo glucose · ${dateKey}`,
      summary: "Synthetic demo data: four glucose readings for chart testing.",
      items: demoReadingItems(date, safeDays - 1 - offset),
      savedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59).toISOString(),
      pinned: false,
    });
  }
  const records = readJson<GuestRecord[]>(RECORDS_KEY, []).filter(
    (record) => !record.id.startsWith(DEMO_RECORD_PREFIX)
  );
  return writeJson(RECORDS_KEY, [...demoRecords, ...records]) ? demoRecords.length : 0;
}

export function removeDemoGlucoseRecords(): number {
  if (typeof window === "undefined") return 0;
  const records = readJson<GuestRecord[]>(RECORDS_KEY, []);
  const remaining = records.filter((record) => !record.id.startsWith(DEMO_RECORD_PREFIX));
  const removed = records.length - remaining.length;
  writeJson(RECORDS_KEY, remaining);
  return removed;
}

export function addGuestRecord(input: {
  title: string;
  summary: string;
  items: ConcludeItem[];
  meals?: ConcludeMeal[];
  sourceText?: string;
}): GuestRecord {
  const record: GuestRecord = {
    ...input,
    id: newId(),
    savedAt: new Date().toISOString(),
    pinned: false,
  };
  const records = readJson<GuestRecord[]>(RECORDS_KEY, []);
  if (writeJson(RECORDS_KEY, [record, ...records])) return record;
  const slim = [record, ...records].map((r, index) =>
    index > 20 ? { ...r, sourceText: undefined } : r
  );
  writeJson(RECORDS_KEY, slim);
  return record;
}

export function deleteGuestRecord(id: string): void {
  writeJson(
    RECORDS_KEY,
    readJson<GuestRecord[]>(RECORDS_KEY, []).filter((record) => record.id !== id)
  );
}

export function updateGuestRecord(
  id: string,
  patch: {
    title: string;
    summary: string;
    items: ConcludeItem[];
    meals?: ConcludeMeal[];
    sourceText?: string;
    pinned?: boolean;
  }
): void {
  writeJson(
    RECORDS_KEY,
    readJson<GuestRecord[]>(RECORDS_KEY, []).map((record) =>
      record.id === id ? { ...record, ...patch } : record
    )
  );
}
