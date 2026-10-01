import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ChatValidationError } from "./errors";

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const STORE_PATH = path.join(process.cwd(), "data", "opencode-keys.json");
const USAGE_CACHE_MS = 60_000;
const UNKNOWN_COOLDOWN_MS = 15 * 60 * 1000;

export interface OpenCodeUsageWindow {
  status: string;
  percent: number;
  resetsAt: string;
}

export interface OpenCodeOfficialUsage {
  rolling: OpenCodeUsageWindow;
  weekly: OpenCodeUsageWindow;
  monthly: OpenCodeUsageWindow;
}

interface StoredKey {
  id: string;
  secret: string;
  exhaustedUntil?: string | null;
}

interface UsageCacheEntry {
  at: number;
  usage: OpenCodeOfficialUsage | null;
  invalid: boolean;
}

const usageCache = new Map<string, UsageCacheEntry>();
const blockedUntil = new Map<string, number>();
let activeSecret: string | null = null;

function isRealKey(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 20) return false;
  return trimmed !== "your_opencode_go_api_key_here" && trimmed !== "your_api_key_here";
}

function keyFromAuthFile(): string | null {
  try {
    const file = path.join(os.homedir(), ".local", "share", "opencode", "auth.json");
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, { key?: string }>;
    const key = parsed["opencode-go"]?.key;
    return isRealKey(key) ? key.trim() : null;
  } catch {
    return null;
  }
}

function configuredSecrets(): string[] {
  const values = [
    ...(process.env.OPENCODE_API_KEYS ?? "").split(/[\s,]+/),
    process.env.OPENCODE_API_KEY,
    keyFromAuthFile(),
  ];
  const secrets: string[] = [];
  for (const value of values) {
    if (!isRealKey(value)) continue;
    const secret = value.trim();
    if (!secrets.includes(secret)) secrets.push(secret);
  }
  return secrets;
}

function readStore(): StoredKey[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as { keys?: StoredKey[] };
    if (!Array.isArray(parsed.keys)) return [];
    return parsed.keys.filter(
      (item) => item && typeof item.id === "string" && isRealKey(item.secret)
    );
  } catch {
    return [];
  }
}

function writeStore(keys: StoredKey[]) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ keys }, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, STORE_PATH);
  fs.chmodSync(STORE_PATH, 0o600);
}

function loadPool(): StoredKey[] {
  const stored = readStore();
  const bySecret = new Map(stored.map((item) => [item.secret, item]));
  const ordered: StoredKey[] = [];
  for (const secret of configuredSecrets()) {
    const existing = bySecret.get(secret);
    if (existing) {
      ordered.push(existing);
      bySecret.delete(secret);
    } else {
      ordered.push({ id: randomUUID(), secret });
    }
  }
  for (const item of stored) {
    if (bySecret.has(item.secret)) ordered.push(item);
  }
  const same =
    stored.length === ordered.length &&
    stored.every((item, index) => item.id === ordered[index]?.id && item.secret === ordered[index]?.secret);
  if (!same) writeStore(ordered);
  return ordered;
}

function replaceKey(next: StoredKey) {
  const keys = loadPool().map((item) => (item.id === next.id ? next : item));
  writeStore(keys);
}

export function keySuffix(secret: string): string {
  return secret.slice(-4);
}

function isRateLimited(usage: OpenCodeOfficialUsage): boolean {
  return [usage.rolling, usage.weekly, usage.monthly].some(
    (window) => window?.status === "rate-limited"
  );
}

function latestReset(usage: OpenCodeOfficialUsage): string | null {
  const resets = [usage.rolling, usage.weekly, usage.monthly]
    .filter((window) => window?.status === "rate-limited" && window.resetsAt)
    .map((window) => Date.parse(window.resetsAt))
    .filter((time) => Number.isFinite(time));
  if (!resets.length) return null;
  return new Date(Math.max(...resets)).toISOString();
}

function cooldownEpoch(item: StoredKey): number {
  const memory = blockedUntil.get(item.secret) ?? 0;
  const stored = item.exhaustedUntil ? Date.parse(item.exhaustedUntil) : 0;
  return Math.max(memory, Number.isFinite(stored) ? stored : 0);
}

function isCoolingDown(item: StoredKey): boolean {
  return cooldownEpoch(item) > Date.now();
}

async function fetchUsage(secret: string): Promise<UsageCacheEntry> {
  const cached = usageCache.get(secret);
  if (cached && Date.now() - cached.at < USAGE_CACHE_MS) return cached;
  let entry: UsageCacheEntry = { at: Date.now(), usage: null, invalid: false };
  try {
    const response = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${secret}`,
        "User-Agent": "InsChat/1.0",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 401) {
      entry = { at: Date.now(), usage: null, invalid: true };
    } else if (response.ok) {
      const body = (await response.json()) as { usage?: Partial<OpenCodeOfficialUsage> };
      const usage = body.usage;
      if (usage?.rolling && usage.weekly && usage.monthly) {
        entry = {
          at: Date.now(),
          usage: {
            rolling: usage.rolling,
            weekly: usage.weekly,
            monthly: usage.monthly,
          },
          invalid: false,
        };
      }
    }
  } catch {
    entry = { at: Date.now(), usage: null, invalid: false };
  }
  usageCache.set(secret, entry);
  return entry;
}

export async function readCachedUsage(secret: string): Promise<OpenCodeOfficialUsage | null> {
  const entry = await fetchUsage(secret);
  return entry.usage;
}

function rememberExhausted(item: StoredKey, until: string) {
  blockedUntil.set(item.secret, Date.parse(until));
  if (item.exhaustedUntil === until) return;
  replaceKey({ ...item, exhaustedUntil: until });
}

export function markKeyRanOut(secret: string, until?: string | null) {
  const item = loadPool().find((candidate) => candidate.secret === secret);
  const reset = until && Number.isFinite(Date.parse(until)) ? until : null;
  const fallback = new Date(Date.now() + UNKNOWN_COOLDOWN_MS).toISOString();
  const exhaustedUntil = reset ?? fallback;
  blockedUntil.set(secret, Date.parse(exhaustedUntil));
  usageCache.delete(secret);
  if (activeSecret === secret) activeSecret = null;
  if (item) replaceKey({ ...item, exhaustedUntil });
}

export function currentOpenCodeKey(): string {
  if (activeSecret) return activeSecret;
  const first = loadPool()[0];
  if (first) return first.secret;
  throw new ChatValidationError("OPENCODE_API_KEY is not configured on the server.");
}

function freshCache(secret: string): UsageCacheEntry | null {
  const cached = usageCache.get(secret);
  if (!cached || Date.now() - cached.at >= USAGE_CACHE_MS) return null;
  return cached;
}

function isReadyCached(item: StoredKey): boolean {
  if (isCoolingDown(item)) return false;
  const entry = freshCache(item.secret);
  return Boolean(entry?.usage && !entry.invalid && !isRateLimited(entry.usage));
}

async function refreshPool(pool: StoredKey[]) {
  await Promise.all(
    pool.map((item) => (isCoolingDown(item) ? Promise.resolve() : fetchUsage(item.secret)))
  );
}

function useKey(item: StoredKey, previous: string | null) {
  if (item.exhaustedUntil) replaceKey({ ...item, exhaustedUntil: null });
  blockedUntil.delete(item.secret);
  activeSecret = item.secret;
  if (previous && previous !== item.secret) {
    console.log(
      `[opencode] key …${keySuffix(previous)} ran out, using …${keySuffix(item.secret)}`
    );
  }
}

function pickReady(pool: StoredKey[], previous: string | null): string | null {
  let unknown: StoredKey | null = null;
  for (const item of pool) {
    if (isCoolingDown(item)) continue;
    const entry = freshCache(item.secret);
    if (!entry || entry.invalid) continue;
    if (!entry.usage) {
      unknown ??= item;
      continue;
    }
    if (isRateLimited(entry.usage)) {
      rememberExhausted(
        item,
        latestReset(entry.usage) ?? new Date(Date.now() + UNKNOWN_COOLDOWN_MS).toISOString()
      );
      continue;
    }
    useKey(item, previous);
    return item.secret;
  }
  if (unknown) {
    activeSecret = unknown.secret;
    return unknown.secret;
  }
  return null;
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function ensureRefresh() {
  if (refreshTimer || process.env.NEXT_PHASE === "phase-production-build") return;
  const tick = () => {
    void refreshPool(loadPool())
      .then(() => {
        const pool = loadPool();
        const active = pool.find((item) => item.secret === activeSecret);
        if (!active || !isReadyCached(active)) pickReady(pool, activeSecret);
      })
      .catch(() => {});
  };
  tick();
  refreshTimer = setInterval(tick, USAGE_CACHE_MS);
  refreshTimer.unref?.();
}

export async function selectOpenCodeKey(): Promise<string> {
  ensureRefresh();
  const pool = loadPool();
  if (!pool.length) {
    throw new ChatValidationError("OPENCODE_API_KEY is not configured on the server.");
  }
  const previous = activeSecret;
  const active = pool.find((item) => item.secret === activeSecret);
  if (active && isReadyCached(active)) return active.secret;
  await refreshPool(pool);
  const chosen = pickReady(pool, previous);
  if (chosen) return chosen;
  const soonest = [...pool].sort((left, right) => cooldownEpoch(left) - cooldownEpoch(right))[0];
  activeSecret = soonest.secret;
  return soonest.secret;
}

export async function describeKeyPool(): Promise<{
  count: number;
  activeSuffix: string | null;
  keys: { suffix: string; state: "ready" | "ran-out" | "unknown" }[];
}> {
  const pool = loadPool();
  const entries = await Promise.all(pool.map((item) => fetchUsage(item.secret)));
  const keys = pool.map((item, index) => {
    const entry = entries[index];
    const ranOut = entry.invalid || isCoolingDown(item) || Boolean(entry.usage && isRateLimited(entry.usage));
    return {
      suffix: keySuffix(item.secret),
      state: (ranOut ? "ran-out" : entry.usage ? "ready" : "unknown") as "ready" | "ran-out" | "unknown",
    };
  });
  let activeSuffix: string | null = null;
  try {
    activeSuffix = keySuffix(await selectOpenCodeKey());
  } catch {
    activeSuffix = null;
  }
  return { count: pool.length, activeSuffix, keys };
}
