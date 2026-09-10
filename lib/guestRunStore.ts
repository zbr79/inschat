import { getDb, updatePendingMessage } from "./db";

interface GuestRunBinding {
  userId: string;
  sessionId: string;
  messageId: string;
}

export interface GuestRunSnapshot {
  sessionId: string;
  messageId: string;
  text: string;
  model?: string;
  trying?: string;
  elapsed?: number;
  status: "pending" | "complete" | "failed";
  startedAt: number;
  updatedAt: number;
  processSteps?: string[];
  binding?: GuestRunBinding;
}

interface GuestRunDoc {
  sessionId: string;
  messageId: string;
  text: string;
  model?: string;
  trying?: string;
  elapsed?: number;
  status: "pending" | "complete" | "failed" | "done";
  startedAt: Date;
  updatedAt: Date;
  processSteps?: string[];
  binding?: GuestRunBinding;
}

const runs = new Map<string, GuestRunSnapshot>();
const RUN_TTL_MS = 30 * 60 * 1000;
const PENDING_STALE_MS = 90_000;
const MAX_PROCESS_STEPS = 80;
const MAX_PROCESS_STEP_LEN = 180;
const MAX_TEXT = 100_000;

function key(sessionId: string, messageId: string): string {
  return `${sessionId}:${messageId}`;
}

function prune(): void {
  const cutoff = Date.now() - RUN_TTL_MS;
  for (const [runKey, run] of runs) {
    if (run.updatedAt < cutoff) runs.delete(runKey);
  }
}

function normalizeStatus(
  status: GuestRunDoc["status"] | GuestRunSnapshot["status"] | undefined
): "pending" | "complete" | "failed" {
  if (status === "done") return "complete";
  if (status === "pending" || status === "failed") return status;
  return "complete";
}

function sanitizeProcessSteps(steps: string[] | undefined): string[] | undefined {
  if (!steps?.length) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of steps) {
    if (typeof raw !== "string") continue;
    const clean = raw.replace(/^\s*\u2192\s+/, "").trim().slice(0, MAX_PROCESS_STEP_LEN);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= MAX_PROCESS_STEPS) break;
  }
  return out.length ? out : undefined;
}

function staleOutcome(text: string): { status: "complete" | "failed"; text: string } {
  if (text.trim()) return { status: "complete", text };
  return {
    status: "failed",
    text: "[Interrupted — the server stopped before finishing this reply.]",
  };
}

function toSnapshot(doc: GuestRunDoc): GuestRunSnapshot {
  return {
    sessionId: doc.sessionId,
    messageId: doc.messageId,
    text: doc.text,
    model: doc.model,
    trying: doc.trying,
    elapsed: doc.elapsed,
    status: normalizeStatus(doc.status),
    startedAt: doc.startedAt.getTime(),
    updatedAt: doc.updatedAt.getTime(),
    processSteps: doc.processSteps,
    binding: doc.binding,
  };
}

async function syncBoundRun(run: GuestRunSnapshot): Promise<void> {
  if (!run.binding) return;
  await updatePendingMessage(
    run.binding.userId,
    run.binding.sessionId,
    run.binding.messageId,
    {
      text: run.text,
      model: run.model,
      trying: run.trying,
      elapsed: run.elapsed,
      status: run.status,
      processSteps: run.processSteps,
    }
  ).catch(() => null);
}

export async function startGuestRun(
  sessionId: string,
  messageId: string
): Promise<GuestRunSnapshot> {
  prune();
  const now = Date.now();
  const run: GuestRunSnapshot = {
    sessionId,
    messageId,
    text: "",
    status: "pending",
    startedAt: now,
    updatedAt: now,
    processSteps: [],
  };
  runs.set(key(sessionId, messageId), run);
  try {
    const db = await getDb();
    await db.collection<GuestRunDoc>("guest_chat_runs").updateOne(
      { sessionId, messageId },
      {
        $set: {
          sessionId,
          messageId,
          text: "",
          status: "pending",
          startedAt: new Date(run.startedAt),
          updatedAt: new Date(run.updatedAt),
        },
        $unset: { processSteps: "", model: "", trying: "", elapsed: "" },
      },
      { upsert: true }
    );
  } catch {}
  return { ...run };
}

export async function updateGuestRun(
  sessionId: string,
  messageId: string,
  patch: Partial<
    Omit<GuestRunSnapshot, "sessionId" | "messageId" | "startedAt">
  >
): Promise<GuestRunSnapshot | null> {
  prune();
  let run: GuestRunSnapshot | null = runs.get(key(sessionId, messageId)) ?? null;
  if (!run) run = await loadPersistedRun(sessionId, messageId);
  if (!run) return null;
  // Progress must not clobber a finalized run.
  if (run.status !== "pending" && (patch.status ?? "pending") === "pending") {
    return { ...run };
  }
  const next: GuestRunSnapshot = {
    ...run,
    ...patch,
    text: patch.text !== undefined ? patch.text.slice(0, MAX_TEXT) : run.text,
    processSteps:
      patch.processSteps !== undefined
        ? sanitizeProcessSteps(patch.processSteps)
        : run.processSteps,
    status: normalizeStatus(patch.status ?? run.status),
    updatedAt: Date.now(),
  };
  runs.set(key(sessionId, messageId), next);
  await savePersistedRun(next);
  await syncBoundRun(next);
  return { ...next };
}

export async function bindGuestRun(
  sessionId: string,
  messageId: string,
  binding: GuestRunBinding
): Promise<boolean> {
  const run = await getGuestRun(sessionId, messageId);
  if (!run) return false;
  const next = { ...run, binding };
  runs.set(key(sessionId, messageId), next);
  await savePersistedRun(next);
  await syncBoundRun(next);
  return true;
}

export async function getGuestRun(
  sessionId: string,
  messageId: string
): Promise<GuestRunSnapshot | null> {
  prune();
  let run: GuestRunSnapshot | null = runs.get(key(sessionId, messageId)) ?? null;
  if (!run) run = await loadPersistedRun(sessionId, messageId);
  if (run && run.status === "pending" && Date.now() - run.updatedAt > PENDING_STALE_MS) {
    const outcome = staleOutcome(run.text);
    run = { ...run, status: outcome.status, text: outcome.text, updatedAt: Date.now() };
    runs.set(key(sessionId, messageId), run);
    await savePersistedRun(run);
  }
  return run ? { ...run } : null;
}

/** Latest run for a guest session (for /api/guest-runs/[id]). */
export async function getLatestGuestRun(
  sessionId: string
): Promise<GuestRunSnapshot | null> {
  prune();
  let best: GuestRunSnapshot | null = null;
  for (const run of runs.values()) {
    if (run.sessionId !== sessionId) continue;
    if (!best || run.updatedAt > best.updatedAt) best = run;
  }
  if (best) {
    return getGuestRun(best.sessionId, best.messageId);
  }
  try {
    const doc = await (await getDb())
      .collection<GuestRunDoc>("guest_chat_runs")
      .find({ sessionId })
      .sort({ updatedAt: -1 })
      .limit(1)
      .next();
    if (!doc) return null;
    const snap = toSnapshot(doc);
    runs.set(key(snap.sessionId, snap.messageId), snap);
    return getGuestRun(snap.sessionId, snap.messageId);
  } catch {
    return null;
  }
}

export async function finalizePendingGuestRun(
  sessionId: string,
  input: { text?: string; elapsed?: number; messageId?: string }
): Promise<boolean> {
  prune();
  let run: GuestRunSnapshot | null = null;
  if (input.messageId) {
    run = await getGuestRun(sessionId, input.messageId);
  } else {
    run = await getLatestGuestRun(sessionId);
  }
  if (!run || run.status !== "pending") return false;
  const setText =
    typeof input.text === "string" &&
    input.text.trim() &&
    input.text.length > (run.text?.length ?? 0)
      ? input.text.slice(0, MAX_TEXT)
      : run.text;
  const next: GuestRunSnapshot = {
    ...run,
    text: setText,
    elapsed: input.elapsed ?? run.elapsed,
    status: "complete",
    updatedAt: Date.now(),
  };
  runs.set(key(sessionId, run.messageId), next);
  await savePersistedRun(next);
  await syncBoundRun(next);
  return true;
}

async function loadPersistedRun(
  sessionId: string,
  messageId: string
): Promise<GuestRunSnapshot | null> {
  try {
    const doc = await (await getDb())
      .collection<GuestRunDoc>("guest_chat_runs")
      .findOne({ sessionId, messageId });
    if (!doc) return null;
    const run = toSnapshot(doc);
    runs.set(key(sessionId, messageId), run);
    return run;
  } catch {
    return null;
  }
}

async function savePersistedRun(run: GuestRunSnapshot): Promise<void> {
  try {
    await (await getDb())
      .collection<GuestRunDoc>("guest_chat_runs")
      .updateOne(
        { sessionId: run.sessionId, messageId: run.messageId },
        {
          $set: {
            sessionId: run.sessionId,
            messageId: run.messageId,
            text: run.text,
            model: run.model,
            trying: run.trying,
            elapsed: run.elapsed,
            status: run.status,
            processSteps: run.processSteps,
            binding: run.binding,
            startedAt: new Date(run.startedAt),
            updatedAt: new Date(run.updatedAt),
          },
        },
        { upsert: true }
      );
  } catch {}
}
