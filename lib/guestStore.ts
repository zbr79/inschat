"use client";

import type { ChatImage, ConcludeItem, ConcludeMeal, SessionConclusion } from "./types";

export interface GuestMessage {
  id?: string;
  role: "user" | "model";
  text: string;
  images?: ChatImage[];
  imageKeys?: string[];
  model?: string;
  trying?: string;
  elapsed?: number;
  status?: "pending" | "complete" | "failed";
  startedAt?: number;
  updatedAt?: number;
  processSteps?: string[];
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
  const now = Date.now();
  target.messages.push({
    ...message,
    id: message.id ?? newId(),
    status: message.status ?? "complete",
    updatedAt: now,
  });
  target.updatedAt = now;
  writeSessions(sessions);
}

export function startGuestPendingMessage(
  sessionId: string,
  messageId = newId()
): string | null {
  const sessions = readJson<GuestSession[]>(SESSIONS_KEY, []);
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) return null;
  const now = Date.now();
  target.messages.push({
    id: messageId,
    role: "model",
    text: "",
    status: "pending",
    startedAt: now,
    updatedAt: now,
  });
  target.updatedAt = now;
  writeSessions(sessions);
  return messageId;
}

export function updateGuestMessage(
  sessionId: string,
  messageId: string,
  patch: Pick<GuestMessage, "text" | "model" | "elapsed" | "status" | "processSteps">
): void {
  const sessions = readJson<GuestSession[]>(SESSIONS_KEY, []);
  const target = sessions.find((session) => session.id === sessionId);
  const message = target?.messages.find((candidate) => candidate.id === messageId);
  if (!target || !message) return;
  Object.assign(message, patch, { updatedAt: Date.now() });
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

function demoRecordContent(date: Date, dayIndex: number, safeDays: number): {
  items: ConcludeItem[];
  meals: ConcludeMeal[];
} {
  const key = localDateKey(date);
  type DemoRank = "low" | "medium" | "high";
  type DemoMealPlan = {
    time: string;
    dishes: Array<{ name: string; rank: DemoRank }>;
  };
  const spikeIndex = Math.max(1, safeDays - 5);
  const wave = Math.round(
    Math.sin(dayIndex * 0.62) * 5 + Math.cos(dayIndex * 0.19) * 3
  );
  const items: ConcludeItem[] = [];
  const addReading = (hour: string, glucose: number) => {
    items.push(
      { name: "glucose", value: String(Math.round(glucose)), unit: "mg/dL" },
      { name: "time", value: `${key} ${hour}` }
    );
  };

  const regularMenus: DemoMealPlan[][] = [
    [
      {
        time: "07:20",
        dishes: [
          { name: "小米粥", rank: "low" },
          { name: "水煮鸡蛋", rank: "low" },
        ],
      },
      {
        time: "12:10",
        dishes: [
          { name: "糙米饭", rank: "medium" },
          { name: "清蒸鲈鱼", rank: "low" },
          { name: "西兰花", rank: "low" },
        ],
      },
      {
        time: "18:30",
        dishes: [
          { name: "荞麦面", rank: "medium" },
          { name: "番茄炒鸡蛋", rank: "low" },
          { name: "清炒菠菜", rank: "low" },
        ],
      },
    ],
    [
      {
        time: "07:40",
        dishes: [
          { name: "无糖豆浆", rank: "low" },
          { name: "全麦馒头", rank: "medium" },
          { name: "凉拌黄瓜", rank: "low" },
        ],
      },
      {
        time: "12:00",
        dishes: [
          { name: "杂粮饭", rank: "medium" },
          { name: "香煎鸡胸肉", rank: "medium" },
          { name: "蒜蓉西兰花", rank: "low" },
        ],
      },
      {
        time: "18:20",
        dishes: [
          { name: "日式荞麦面", rank: "medium" },
          { name: "烤三文鱼", rank: "low" },
          { name: "生菜沙拉", rank: "low" },
        ],
      },
    ],
    [
      {
        time: "07:30",
        dishes: [
          { name: "鸡蛋灌饼", rank: "medium" },
          { name: "无糖豆浆", rank: "low" },
        ],
      },
      {
        time: "12:10",
        dishes: [
          { name: "牛肉河粉", rank: "medium" },
          { name: "清炒上海青", rank: "low" },
          { name: "海带汤", rank: "low" },
        ],
      },
      {
        time: "18:30",
        dishes: [
          { name: "糙米饭", rank: "medium" },
          { name: "清蒸虾", rank: "low" },
          { name: "凉拌木耳", rank: "low" },
        ],
      },
    ],
  ];
  const spikeMenu: DemoMealPlan[] = [
    {
      time: "07:20",
      dishes: [
        { name: "小米粥", rank: "low" },
        { name: "茶叶蛋", rank: "low" },
      ],
    },
    {
      time: "12:10",
      dishes: [
        { name: "白米饭", rank: "medium" },
        { name: "红烧肉", rank: "high" },
        { name: "清炒空心菜", rank: "low" },
      ],
    },
    {
      time: "18:30",
      dishes: [
        { name: "韩式炸鸡", rank: "high" },
        { name: "辣炒年糕", rank: "high" },
        { name: "甜辣酱", rank: "high" },
      ],
    },
  ];
  const recoveryMenu: DemoMealPlan[] = [
    {
      time: "07:20",
      dishes: [
        { name: "无糖豆浆", rank: "low" },
        { name: "水煮鸡蛋", rank: "low" },
      ],
    },
    {
      time: "12:10",
      dishes: [
        { name: "杂粮饭", rank: "medium" },
        { name: "清蒸鲈鱼", rank: "low" },
        { name: "西兰花", rank: "low" },
      ],
    },
    {
      time: "18:30",
      dishes: [
        { name: "荞麦面", rank: "medium" },
        { name: "清炒菠菜", rank: "low" },
        { name: "凉拌黄瓜", rank: "low" },
      ],
    },
  ];
  const menu =
    dayIndex === spikeIndex - 1
      ? spikeMenu
      : dayIndex === spikeIndex
        ? recoveryMenu
        : regularMenus[dayIndex % regularMenus.length];
  const meals: ConcludeMeal[] = menu.map(({ time, dishes }) => ({
    name: "",
    time: `${key} ${time}`,
    dishes,
  }));

  const hasLowExample =
    dayIndex % 9 === 4 || dayIndex === Math.max(0, safeDays - 2);
  const morning = hasLowExample ? 108 : 116 + wave;
  const lunch = 119 + wave + (dayIndex % 11 === 6 ? 8 : 0);
  const dinner = dayIndex === spikeIndex ? 180 : 122 + wave;
  addReading("07:30", morning);
  addReading("11:30", lunch);
  addReading("17:30", dinner);

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
    const content = demoRecordContent(date, safeDays - 1 - offset, safeDays);
    demoRecords.push({
      id: `${DEMO_RECORD_PREFIX}${dateKey}`,
      title: "",
      summary: "",
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
  const records = readGuestReport().entries;
  const existingIndex = input.sessionId
    ? records.findIndex((record) => record.sessionId === input.sessionId)
    : -1;
  if (existingIndex >= 0) {
    const existing = records[existingIndex];
    const updated: GuestRecord = {
      ...existing,
      ...input,
      id: existing.id,
      savedAt: existing.savedAt,
      recordedAt: input.recordedAt ?? existing.recordedAt ?? now,
      pinned: existing.pinned ?? false,
    };
    records[existingIndex] = updated;
    writeGuestReport(records);
    return updated;
  }
  const record: GuestRecord = {
    ...input,
    id: newId(),
    savedAt: now,
    recordedAt: input.recordedAt ?? now,
    pinned: false,
  };
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
