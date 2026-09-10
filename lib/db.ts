import { Db, MongoClient, ObjectId } from "mongodb";
import { randomBytes } from "node:crypto";
import type {
  ApiCall,
  ChatSession,
  ConcludeItem,
  ConcludeMeal,
  SavedRecord,
  SessionConclusion,
  StoredMessage,
} from "./types";

const DB_NAME = process.env.MONGODB_DB || "inschat";

interface RecordDoc {
  _id?: ObjectId;
  userId?: ObjectId;
  title: string;
  summary: string;
  items: ConcludeItem[];
  meals?: ConcludeMeal[];
  sourceText?: string;
  imageKeys?: string[];
  savedAt: Date;
  datetime: Date | null;
  pinned?: boolean;
}

interface ReportEntryDoc {
  id: string;
  sessionId?: string;
  title: string;
  summary: string;
  items: ConcludeItem[];
  meals?: ConcludeMeal[] | null;
  sourceText?: string | null;
  imageKeys?: string[] | null;
  savedAt: Date;
  datetime: Date | null;
  recordedAt: Date;
  pinned?: boolean;
}

interface AccountReportDoc {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  entries: ReportEntryDoc[];
  createdAt: Date;
  updatedAt: Date;
}

let clientPromise: Promise<MongoClient> | null = null;

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new Error("MONGODB_URI is not configured on the server.")
    );
  }
  if (!clientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  return (await getClient()).db(DB_NAME);
}

export function toSavedRecord(doc: RecordDoc): SavedRecord {
  return {
    _id: doc._id?.toString() ?? "",
    title: doc.title,
    summary: doc.summary,
    items: doc.items,
    meals: doc.meals,
    sourceText: doc.sourceText,
    imageKeys: doc.imageKeys,
    savedAt: doc.savedAt.toISOString(),
    datetime: doc.datetime ? doc.datetime.toISOString() : null,
    pinned: doc.pinned ?? false,
  };
}

export async function insertRecord(
  userId: string,
  input: {
    title: string;
    summary: string;
    items: ConcludeItem[];
    meals?: ConcludeMeal[];
    sourceText?: string;
    imageKeys?: string[];
    datetime: Date | null;
  }
): Promise<SavedRecord> {
  const db = await getDb();
  // The record always carries its own time (when it was concluded/saved),
  // never a timestamp derived from the photo/chat content.
  const doc: RecordDoc = {
    ...input,
    datetime: new Date(),
    userId: new ObjectId(userId),
    savedAt: new Date(),
    pinned: false,
  };
  const result = await db.collection<RecordDoc>("records").insertOne(doc);
  return toSavedRecord({ ...doc, _id: result.insertedId });
}

export async function listRecords(userId: string, limit = 100): Promise<SavedRecord[]> {
  const db = await getDb();
  const docs = await db
    .collection<RecordDoc>("records")
    .find({ userId: new ObjectId(userId) })
    .sort({ pinned: -1, savedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toSavedRecord);
}

export async function deleteRecord(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db
    .collection<RecordDoc>("records")
    .deleteOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  return result.deletedCount > 0;
}

export async function updateRecord(
  userId: string,
  id: string,
  input: {
    title: string;
    summary: string;
    items: ConcludeItem[];
    meals?: ConcludeMeal[];
    sourceText?: string;
    imageKeys?: string[];
    pinned?: boolean;
  }
): Promise<SavedRecord | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const result = await db
    .collection<RecordDoc>("records")
    .findOneAndUpdate(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      {
        $set: {
          title: input.title,
          summary: input.summary,
          items: input.items,
          meals: input.meals,
          sourceText: input.sourceText,
          ...(input.imageKeys === undefined ? {} : { imageKeys: input.imageKeys }),
          ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        },
      },
      { returnDocument: "after" }
    );
  return result ? toSavedRecord(result) : null;
}

function reportDate(value: string | undefined, fallback = new Date()): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toSavedReportEntry(entry: ReportEntryDoc): SavedRecord {
  return {
    _id: entry.id,
    title: entry.title,
    summary: entry.summary,
    items: entry.items,
    meals: entry.meals ?? undefined,
    sourceText: entry.sourceText ?? undefined,
    imageKeys: entry.imageKeys ?? undefined,
    savedAt: entry.savedAt.toISOString(),
    datetime: entry.datetime?.toISOString() ?? null,
    recordedAt: entry.recordedAt.toISOString(),
    sessionId: entry.sessionId,
    pinned: entry.pinned ?? false,
  };
}

async function ensureAccountReport(userId: string): Promise<AccountReportDoc> {
  const db = await getDb();
  const reports = db.collection<AccountReportDoc>("account_reports");
  const ownerId = new ObjectId(userId);
  const existing = await reports.findOne({ userId: ownerId });
  if (existing) return existing;

  // Migrate old per-session records the first time the account report is read.
  const legacy = await db
    .collection<RecordDoc>("records")
    .find({ userId: ownerId })
    .sort({ savedAt: 1 })
    .toArray();
  const now = new Date();
  const candidate: AccountReportDoc = {
    _id: new ObjectId(),
    userId: ownerId,
    title: "Health report",
    entries: legacy.map((record) => ({
      id: record._id?.toString() ?? new ObjectId().toString(),
      title: record.title,
      summary: record.summary,
      items: record.items,
      meals: record.meals,
      sourceText: record.sourceText,
      imageKeys: record.imageKeys,
      savedAt: record.savedAt,
      datetime: record.datetime,
      recordedAt: record.datetime ?? record.savedAt,
      pinned: record.pinned ?? false,
    })),
    createdAt: now,
    updatedAt: now,
  };
  try {
    await reports.updateOne(
      { userId: ownerId },
      { $setOnInsert: candidate },
      { upsert: true }
    );
  } catch {
    // Another request may have initialized this account's report concurrently.
  }
  return (await reports.findOne({ userId: ownerId })) ?? candidate;
}

export async function listReportEntries(userId: string): Promise<SavedRecord[]> {
  const report = await ensureAccountReport(userId);
  return [...report.entries]
    .sort(
      (a, b) =>
        Number(b.pinned ?? false) - Number(a.pinned ?? false) ||
        b.recordedAt.getTime() - a.recordedAt.getTime()
    )
    .map(toSavedReportEntry);
}

export async function appendReportEntry(
  userId: string,
  input: {
    title: string;
    summary: string;
    items: ConcludeItem[];
    meals?: ConcludeMeal[];
    sourceText?: string;
    imageKeys?: string[];
    sessionId?: string;
    recordedAt?: string;
  }
): Promise<SavedRecord> {
  const report = await ensureAccountReport(userId);
  const now = new Date();
  const recordedAt = reportDate(input.recordedAt, now);
  const entry: ReportEntryDoc = {
    id: new ObjectId().toString(),
    sessionId: input.sessionId,
    title: input.title,
    summary: input.summary,
    items: input.items,
    meals: input.meals,
    sourceText: input.sourceText,
    imageKeys: input.imageKeys,
    savedAt: now,
    datetime: recordedAt,
    recordedAt,
    pinned: false,
  };
  const db = await getDb();
  const reports = db.collection<AccountReportDoc>("account_reports");
  if (input.sessionId) {
    const set: Record<string, unknown> = {
      "entries.$[entry].title": input.title,
      "entries.$[entry].summary": input.summary,
      "entries.$[entry].items": input.items,
      "entries.$[entry].meals": input.meals ?? null,
      "entries.$[entry].sourceText": input.sourceText ?? null,
      "entries.$[entry].imageKeys": input.imageKeys ?? [],
      updatedAt: now,
    };
    if (input.recordedAt !== undefined) {
      set["entries.$[entry].recordedAt"] = recordedAt;
      set["entries.$[entry].datetime"] = recordedAt;
    }
    const updated = await reports.findOneAndUpdate(
      { _id: report._id, "entries.sessionId": input.sessionId },
      { $set: set },
      {
        arrayFilters: [{ "entry.sessionId": input.sessionId }],
        returnDocument: "after",
      }
    );
    const updatedEntry = updated?.entries.find(
      (candidate) => candidate.sessionId === input.sessionId
    );
    if (updatedEntry) return toSavedReportEntry(updatedEntry);

    const inserted = await reports.findOneAndUpdate(
      { _id: report._id, "entries.sessionId": { $ne: input.sessionId } },
      { $push: { entries: entry }, $set: { updatedAt: now } },
      { returnDocument: "after" }
    );
    const insertedEntry = inserted?.entries.find(
      (candidate) => candidate.sessionId === input.sessionId
    );
    if (insertedEntry) return toSavedReportEntry(insertedEntry);

    const raced = await reports.findOne({ _id: report._id });
    const racedEntry = raced?.entries.find(
      (candidate) => candidate.sessionId === input.sessionId
    );
    if (racedEntry) return toSavedReportEntry(racedEntry);
  } else {
    await reports.updateOne(
      { _id: report._id },
      { $push: { entries: entry }, $set: { updatedAt: now } }
    );
  }
  return toSavedReportEntry(entry);
}

export async function updateReportEntry(
  userId: string,
  id: string,
  input: {
    title: string;
    summary: string;
    items: ConcludeItem[];
    meals?: ConcludeMeal[];
    sourceText?: string;
    imageKeys?: string[];
    sessionId?: string;
    recordedAt?: string;
    pinned?: boolean;
  }
): Promise<SavedRecord | null> {
  await ensureAccountReport(userId);
  const now = new Date();
  const db = await getDb();
  const set: Record<string, unknown> = {
    "entries.$.title": input.title,
    "entries.$.summary": input.summary,
    "entries.$.items": input.items,
    "entries.$.meals": input.meals ?? null,
    updatedAt: now,
  };
  if (input.sourceText !== undefined) set["entries.$.sourceText"] = input.sourceText;
  if (input.imageKeys !== undefined) set["entries.$.imageKeys"] = input.imageKeys;
  if (input.sessionId !== undefined) set["entries.$.sessionId"] = input.sessionId;
  if (input.recordedAt !== undefined) {
    const recordedAt = reportDate(input.recordedAt, now);
    set["entries.$.recordedAt"] = recordedAt;
    set["entries.$.datetime"] = recordedAt;
  }
  if (input.pinned !== undefined) set["entries.$.pinned"] = input.pinned;
  const result = await db.collection<AccountReportDoc>("account_reports").findOneAndUpdate(
    { userId: new ObjectId(userId), "entries.id": id },
    { $set: set },
    { returnDocument: "after" }
  );
  const entry = result?.entries.find((candidate) => candidate.id === id);
  return entry ? toSavedReportEntry(entry) : null;
}

export async function deleteReportEntry(userId: string, id: string): Promise<boolean> {
  await ensureAccountReport(userId);
  const db = await getDb();
  const result = await db.collection<AccountReportDoc>("account_reports").updateOne(
    { userId: new ObjectId(userId), "entries.id": id },
    { $pull: { entries: { id } }, $set: { updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function clearAllReportEntries(userId: string): Promise<void> {
  const report = await ensureAccountReport(userId);
  const db = await getDb();
  await Promise.all([
    db.collection<AccountReportDoc>("account_reports").updateOne(
      { userId: new ObjectId(userId) },
      { $set: { entries: [], updatedAt: new Date() } }
    ),
    db.collection<RecordDoc>("records").deleteMany({
      userId: new ObjectId(userId),
    }),
  ]);
}

interface CallDoc {
  _id?: ObjectId;
  kind: "chat" | "conclude" | "health" | "opencode";
  model: string;
  ok: boolean;
  error?: string;
  at: Date;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
  };
}

export function toApiCall(doc: CallDoc): ApiCall {
  return {
    _id: doc._id?.toString() ?? "",
    kind: doc.kind,
    model: doc.model,
    ok: doc.ok,
    error: doc.error,
    at: doc.at.toISOString(),
    cost: doc.cost,
    tokens: doc.tokens,
  };
}

export async function insertCall(input: {
  kind: "chat" | "conclude" | "health" | "opencode";
  model: string;
  ok: boolean;
  error?: string;
  cost?: number;
  tokens?: CallDoc["tokens"];
}): Promise<void> {
  const db = await getDb();
  const doc: CallDoc = { ...input, at: new Date() };
  await db.collection<CallDoc>("calls").insertOne(doc);
}

export async function listCalls(limit = 100): Promise<ApiCall[]> {
  const db = await getDb();
  const docs = await db
    .collection<CallDoc>("calls")
    .find({})
    .sort({ at: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toApiCall);
}

export async function countCalls(): Promise<{ total: number; failed: number }> {
  const db = await getDb();
  const collection = db.collection<CallDoc>("calls");
  const [total, failed] = await Promise.all([
    collection.countDocuments(),
    collection.countDocuments({ ok: false }),
  ]);
  return { total, failed };
}

export interface OpenCodeUsage {
  total: number;
  last5h: number;
  last7d: number;
  last30d: number;
  failed30d: number;
  cost30d: number;
  tokens30d: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
  };
  models: { model: string; count: number }[];
  recent: ApiCall[];
}

export async function getOpenCodeUsage(): Promise<OpenCodeUsage> {
  const db = await getDb();
  const collection = db.collection<CallDoc>("calls");
  const now = new Date();
  const since5h = new Date(now.getTime() - 5 * 3600_000);
  const since7d = new Date(now.getTime() - 7 * 86400_000);
  const since30d = new Date(now.getTime() - 30 * 86400_000);
  const [total, failed30d, last5h, last7d, last30d, byModel, recent, costAgg] =
    await Promise.all([
      collection.countDocuments({ kind: "opencode" }),
      collection.countDocuments({
        kind: "opencode",
        ok: false,
        at: { $gte: since30d },
      }),
      collection.countDocuments({ kind: "opencode", at: { $gte: since5h } }),
      collection.countDocuments({ kind: "opencode", at: { $gte: since7d } }),
      collection.countDocuments({ kind: "opencode", at: { $gte: since30d } }),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { kind: "opencode", at: { $gte: since30d } } },
          { $group: { _id: "$model", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      collection
        .find({ kind: "opencode" })
        .sort({ at: -1 })
        .limit(50)
        .toArray(),
      collection
        .aggregate<{
          cost: number;
          input: number;
          output: number;
          reasoning: number;
          cacheRead: number;
          cacheWrite: number;
        }>([
          { $match: { kind: "opencode", at: { $gte: since30d } } },
          {
            $group: {
              _id: null,
              cost: { $sum: { $ifNull: ["$cost", 0] } },
              input: { $sum: { $ifNull: ["$tokens.input", 0] } },
              output: { $sum: { $ifNull: ["$tokens.output", 0] } },
              reasoning: { $sum: { $ifNull: ["$tokens.reasoning", 0] } },
              cacheRead: { $sum: { $ifNull: ["$tokens.cacheRead", 0] } },
              cacheWrite: { $sum: { $ifNull: ["$tokens.cacheWrite", 0] } },
            },
          },
        ])
        .toArray(),
    ]);
  const agg = costAgg[0] ?? {
    cost: 0,
    input: 0,
    output: 0,
    reasoning: 0,
    cacheRead: 0,
    cacheWrite: 0,
  };
  return {
    total,
    last5h,
    last7d,
    last30d,
    failed30d,
    cost30d: Math.round(agg.cost * 10000) / 10000,
    tokens30d: {
      input: agg.input,
      output: agg.output,
      reasoning: agg.reasoning,
      cacheRead: agg.cacheRead,
      cacheWrite: agg.cacheWrite,
    },
    models: byModel.map((row) => ({
      model: row._id ?? "unknown",
      count: row.count,
    })),
    recent: recent.map(toApiCall),
  };
}

interface SessionDoc {
  _id?: ObjectId;
  userId?: ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
  conclusion?: SessionConclusion | null;
  recordId?: string | null;
}

interface MessageDoc {
  _id?: ObjectId;
  sessionId: ObjectId;
  role: "user" | "model";
  text: string;
  imageKeys?: string[];
  model?: string;
  trying?: string;
  elapsed?: number;
  createdAt: Date;
  status?: "pending" | "complete" | "failed" | "done";
  startedAt?: Date;
  updatedAt?: Date;
  processSteps?: string[];
}

const MAX_MESSAGE_TEXT = 100_000;
// Model messages stream server-side heartbeats every 10 s while a run is
// live; a pending doc untouched for this long has missed ~9 beats, so the
// process that owned it is gone.
const PENDING_STALE_MS = 90_000;

// A pending doc whose heartbeat went stale has no live handler left. If it
// streamed an answer, that answer is real — only the finalizer died — so
// close it as complete rather than flagging a complete reply "interrupted".
function stalePendingOutcome(doc: { text?: string }): {
  status: "complete" | "failed";
  text: string;
} {
  if (doc.text?.trim()) return { status: "complete", text: doc.text };
  return {
    status: "failed",
    text: "[Interrupted — the server stopped before finishing this reply.]",
  };
}

const MAX_PROCESS_STEPS = 80;
const MAX_PROCESS_STEP_LEN = 180;

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

/** Normalize agent "done" to inschat "complete" for shared Mongo docs. */
function normalizeStatus(
  status: MessageDoc["status"] | undefined
): StoredMessage["status"] | undefined {
  if (status === "done") return "complete";
  return status;
}

function toChatSession(doc: SessionDoc): ChatSession {
  return {
    _id: doc._id?.toString() ?? "",
    title: doc.title,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    pinned: doc.pinned,
  };
}

function toStoredMessage(doc: MessageDoc): StoredMessage {
  return {
    _id: doc._id?.toString() ?? "",
    sessionId: doc.sessionId.toString(),
    role: doc.role,
    text: doc.text,
    imageKeys: doc.imageKeys,
    model: doc.model,
    trying: doc.trying,
    elapsed: doc.elapsed,
    createdAt: doc.createdAt.toISOString(),
    status: normalizeStatus(doc.status),
    startedAt: doc.startedAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
    processSteps: doc.processSteps,
  };
}

export async function insertSession(userId: string, title: string): Promise<ChatSession> {
  const db = await getDb();
  const now = new Date();
  const doc: SessionDoc = { userId: new ObjectId(userId), title, createdAt: now, updatedAt: now };
  const result = await db.collection<SessionDoc>("sessions").insertOne(doc);
  return toChatSession({ ...doc, _id: result.insertedId });
}

export async function listSessions(userId: string, limit = 50): Promise<ChatSession[]> {
  const db = await getDb();
  const docs = await db
    .collection<SessionDoc>("sessions")
    .find({ userId: new ObjectId(userId) })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toChatSession);
}

export async function getSessionWithMessages(
  userId: string,
  id: string
): Promise<{
  session: ChatSession;
  messages: StoredMessage[];
  conclusion: SessionConclusion | null;
  recordId: string | null;
} | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("sessions")
    .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  if (!session) return null;
  const docs = await db
    .collection<MessageDoc>("messages")
    .find({ sessionId: new ObjectId(id) })
    .sort({ createdAt: 1 })
    .toArray();
  // Safety net: a server restart kills detached runs, leaving their pending
  // docs orphaned. Anything whose heartbeat went stale is closed here ?
  // complete when an answer was streamed, failed only when nothing was.
  const cutoff = Date.now() - PENDING_STALE_MS;
  for (const doc of docs) {
    if (doc.status !== "pending") continue;
    if ((doc.updatedAt ?? doc.createdAt).getTime() > cutoff) continue;
    const outcome = stalePendingOutcome(doc);
    const now = new Date();
    await db
      .collection<MessageDoc>("messages")
      .updateOne(
        { _id: doc._id },
        { $set: { status: outcome.status, text: outcome.text, updatedAt: now } }
      );
    doc.status = outcome.status;
    doc.text = outcome.text;
    doc.updatedAt = now;
  }
  return {
    session: toChatSession(session),
    messages: docs.map(toStoredMessage),
    conclusion: session.conclusion ?? null,
    recordId: session.recordId ?? null,
  };
}

export async function setSessionConclusion(
  userId: string,
  id: string,
  conclusion: SessionConclusion | null,
  recordId?: string | null
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const set: Record<string, unknown> = {
    conclusion: conclusion ?? null,
    updatedAt: new Date(),
  };
  if (recordId !== undefined) set.recordId = recordId ?? null;
  const result = await db
    .collection<SessionDoc>("sessions")
    .updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: set }
    );
  return result.matchedCount > 0;
}

export async function setSessionRecordId(
  userId: string,
  id: string,
  recordId: string | null
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db
    .collection<SessionDoc>("sessions")
    .updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: { recordId: recordId ?? null, updatedAt: new Date() } }
    );
  return result.matchedCount > 0;
}

export async function appendMessage(
  userId: string,
  sessionId: string,
  input: {
    role: "user" | "model";
    text: string;
    imageKeys?: string[];
    model?: string;
    trying?: string;
    elapsed?: number;
  }
): Promise<StoredMessage | null> {
  if (!ObjectId.isValid(sessionId)) return null;
  const db = await getDb();
  const now = new Date();
  const doc: MessageDoc = {
    sessionId: new ObjectId(sessionId),
    role: input.role,
    text: input.text,
    imageKeys: input.imageKeys,
    model: input.model,
    trying: input.trying,
    elapsed: input.elapsed,
    createdAt: now,
    status: "complete",
    updatedAt: now,
  };
  await db.collection<MessageDoc>("messages").insertOne(doc);
  const updated = await db
    .collection<SessionDoc>("sessions")
    .updateOne(
      { _id: new ObjectId(sessionId), userId: new ObjectId(userId) },
      { $set: { updatedAt: now } }
    );
  if (updated.matchedCount === 0) return null;
  return toStoredMessage(doc);
}

export async function startPendingMessage(
  userId: string,
  sessionId: string,
  input: { messageId?: string; startedAt?: Date }
): Promise<StoredMessage | null> {
  if (!ObjectId.isValid(sessionId)) return null;
  const db = await getDb();
  const now = input.startedAt ?? new Date();
  const session = await db.collection<SessionDoc>("sessions").findOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(userId),
  });
  if (!session) return null;
  const doc: MessageDoc = {
    _id: input.messageId && ObjectId.isValid(input.messageId)
      ? new ObjectId(input.messageId)
      : undefined,
    sessionId: new ObjectId(sessionId),
    role: "model",
    text: "",
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    status: "pending",
  };
  const result = await db.collection<MessageDoc>("messages").insertOne(doc);
  await db.collection<SessionDoc>("sessions").updateOne(
    { _id: new ObjectId(sessionId), userId: new ObjectId(userId) },
    { $set: { updatedAt: now } }
  );
  return toStoredMessage({ ...doc, _id: result.insertedId });
}

export async function updatePendingMessage(
  userId: string,
  sessionId: string,
  messageId: string,
  patch: {
    text: string;
    model?: string;
    trying?: string;
    elapsed?: number;
    status?: "pending" | "complete" | "failed";
    processSteps?: string[];
  }
): Promise<StoredMessage | null> {
  if (!ObjectId.isValid(sessionId) || !ObjectId.isValid(messageId)) return null;
  const now = new Date();
  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(userId),
  });
  if (!session) return null;
  const status = patch.status ?? "pending";
  const set: Record<string, unknown> = {
    text: patch.text.slice(0, MAX_MESSAGE_TEXT),
    status,
    updatedAt: now,
  };
  if (patch.model !== undefined) set.model = patch.model;
  if (patch.trying !== undefined) set.trying = patch.trying;
  if (patch.elapsed !== undefined) set.elapsed = patch.elapsed;
  if (patch.processSteps !== undefined) {
    const steps = sanitizeProcessSteps(patch.processSteps);
    if (steps) set.processSteps = steps;
  }
  // Progress heartbeats must not clobber a finalized message.
  const filter: Record<string, unknown> = {
    _id: new ObjectId(messageId),
    sessionId: new ObjectId(sessionId),
    role: "model",
  };
  if (status === "pending") filter.status = "pending";
  const result = await db
    .collection<MessageDoc>("messages")
    .findOneAndUpdate(filter, { $set: set }, { returnDocument: "after" });
  if (!result) return null;
  await db.collection<SessionDoc>("sessions").updateOne(
    { _id: new ObjectId(sessionId), userId: new ObjectId(userId) },
    { $set: { updatedAt: now } }
  );
  return toStoredMessage(result);
}

// Client-driven finalize: the browser received a complete answer, so close
// the placeholder even if the handler died before its own finalize. Filtered
// to status "pending". Client text only wins when longer than last heartbeat.
export async function finalizePendingMessage(
  userId: string,
  sessionId: string,
  messageId: string,
  input: { text?: string; elapsed?: number }
): Promise<boolean> {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(sessionId) ||
    !ObjectId.isValid(messageId)
  ) {
    return false;
  }
  const db = await getDb();
  const owned = await db
    .collection<SessionDoc>("sessions")
    .findOne(
      { _id: new ObjectId(sessionId), userId: new ObjectId(userId) },
      { projection: { _id: 1 } }
    );
  if (!owned) return false;
  const doc = await db
    .collection<MessageDoc>("messages")
    .findOne(
      { _id: new ObjectId(messageId), sessionId: new ObjectId(sessionId), status: "pending" },
      { projection: { text: 1 } }
    );
  if (!doc) return false;
  const set: Record<string, unknown> = { status: "complete", updatedAt: new Date() };
  if (input.elapsed !== undefined) set.elapsed = input.elapsed;
  if (
    typeof input.text === "string" &&
    input.text.trim() &&
    input.text.length > (doc.text?.length ?? 0)
  ) {
    set.text = input.text.slice(0, MAX_MESSAGE_TEXT);
  }
  const result = await db
    .collection<MessageDoc>("messages")
    .updateOne({ _id: doc._id, status: "pending" }, { $set: set });
  return result.matchedCount > 0;
}

export async function getSessionMessage(
  userId: string,
  sessionId: string,
  messageId: string
): Promise<StoredMessage | null> {
  if (!ObjectId.isValid(sessionId) || !ObjectId.isValid(messageId)) return null;
  const db = await getDb();
  const session = await db.collection<SessionDoc>("sessions").findOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(userId),
  });
  if (!session) return null;
  let message = await db.collection<MessageDoc>("messages").findOne({
    _id: new ObjectId(messageId),
    sessionId: new ObjectId(sessionId),
  });
  if (!message) return null;
  if (
    message.status === "pending" &&
    Date.now() - (message.updatedAt ?? message.createdAt).getTime() > PENDING_STALE_MS
  ) {
    const outcome = stalePendingOutcome(message);
    message =
      (await db.collection<MessageDoc>("messages").findOneAndUpdate(
        { _id: message._id, status: "pending" },
        {
          $set: {
            status: outcome.status,
            text: outcome.text,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      )) ?? message;
  }
  return toStoredMessage(message);
}

// Revert: keep the first `keep` messages of the session, delete the rest.
export async function truncateMessages(
  userId: string,
  sessionId: string,
  keep: number
): Promise<number> {
  if (!ObjectId.isValid(sessionId) || keep < 0) return 0;
  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("sessions")
    .findOne({ _id: new ObjectId(sessionId), userId: new ObjectId(userId) });
  if (!session) return 0;
  const docs = await db
    .collection<MessageDoc>("messages")
    .find({ sessionId: new ObjectId(sessionId) })
    .sort({ createdAt: 1 })
    .toArray();
  const removed = docs.slice(keep);
  if (removed.length === 0) return 0;
  await db
    .collection<MessageDoc>("messages")
    .deleteMany({ _id: { $in: removed.map((doc) => doc._id) } });
  await db
    .collection<SessionDoc>("sessions")
    .updateOne(
      { _id: new ObjectId(sessionId), userId: new ObjectId(userId) },
      { $set: { updatedAt: new Date(), conclusion: null } }
    );
  return removed.length;
}

export async function setSessionTitle(
  userId: string,
  id: string,
  title: string
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db
    .collection<SessionDoc>("sessions")
    .updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: { title, updatedAt: new Date() } }
    );
  return result.matchedCount > 0;
}

export async function setSessionPinned(
  userId: string,
  id: string,
  pinned: boolean
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db
    .collection<SessionDoc>("sessions")
    .updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(userId) },
      { $set: { pinned } }
    );
  return result.matchedCount > 0;
}

export async function deleteSession(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  await db.collection<MessageDoc>("messages").deleteMany({
    sessionId: new ObjectId(id),
  });
  const result = await db
    .collection<SessionDoc>("sessions")
    .deleteOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  return result.deletedCount > 0;
}

export async function clearAllSessions(userId: string): Promise<void> {
  const db = await getDb();
  const ownerId = new ObjectId(userId);
  const sessions = await db
    .collection<SessionDoc>("sessions")
    .find({ userId: ownerId }, { projection: { _id: 1 } })
    .toArray();
  const sessionIds = sessions.flatMap((session) => (session._id ? [session._id] : []));
  await Promise.all([
    sessionIds.length
      ? db.collection<MessageDoc>("messages").deleteMany({ sessionId: { $in: sessionIds } })
      : Promise.resolve(),
    db.collection<SessionDoc>("sessions").deleteMany({ userId: ownerId }),
  ]);
}

export async function clearAllAccountData(userId: string): Promise<void> {
  await Promise.all([
    clearAllSessions(userId),
    clearAllReportEntries(userId),
  ]);
}

interface ShareDoc {
  _id?: ObjectId;
  token: string;
  kind: "chat" | "message";
  title: string;
  messages: {
    role: "user" | "model";
    text: string;
    model?: string;
    elapsed?: number;
  }[];
  createdAt: Date;
}

export interface SharedContent {
  kind: "chat" | "message";
  title: string;
  messages: ShareDoc["messages"];
  createdAt: string;
}

function toSharedContent(doc: ShareDoc): SharedContent {
  return {
    kind: doc.kind,
    title: doc.title,
    messages: doc.messages.map(({ role, text, model, elapsed }) => ({
      role,
      text,
      model,
      elapsed,
    })),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function insertShare(input: {
  kind: "chat" | "message";
  title: string;
  messages: ShareDoc["messages"];
}): Promise<string> {
  const db = await getDb();
  const token = randomBytes(9).toString("base64url");
  const doc: ShareDoc = { ...input, token, createdAt: new Date() };
  await db.collection<ShareDoc>("shares").insertOne(doc);
  return token;
}

export async function getShare(token: string): Promise<SharedContent | null> {
  const db = await getDb();
  const doc = await db.collection<ShareDoc>("shares").findOne({ token });
  return doc ? toSharedContent(doc) : null;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface SearchHit {
  sessionId: string;
  title: string;
  snippet: string;
  matches: number;
  updatedAt: string;
  messageId?: string;
}

// Full-history search: match message text, group by session, return a
// snippet around the first match.
export async function searchChats(
  userId: string,
  q: string,
  limit = 20
): Promise<SearchHit[]> {
  const db = await getDb();
  const regex = new RegExp(escapeRegex(q), "i");
  const grouped = await db
    .collection<MessageDoc>("messages")
    .aggregate<{ _id: ObjectId; count: number; first: MessageDoc }>([
      { $match: { text: regex } },
      { $group: { _id: "$sessionId", count: { $sum: 1 }, first: { $first: "$$ROOT" } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ])
    .toArray();
  const ids = grouped.map((row) => row._id);
  if (ids.length === 0) return [];
  const sessions = await db
    .collection<SessionDoc>("sessions")
    .find({ _id: { $in: ids }, userId: new ObjectId(userId) })
    .toArray();
  const byId = new Map(sessions.map((s) => [s._id!.toString(), s]));
  return grouped.flatMap((row) => {
    const sid = row._id.toString();
    const session = byId.get(sid);
    if (!session) return [];
    const text = String(row.first.text ?? "");
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    const start = Math.max(0, idx - 12);
    const snippet =
      (start > 0 ? "…" : "") + text.slice(start, start + 100).replace(/\s+/g, " ");
    return [
      {
        sessionId: sid,
        title: session.title,
        snippet,
        matches: row.count,
        updatedAt: session.updatedAt.toISOString(),
        messageId: row.first._id?.toString(),
      },
    ];
  });
}

export interface RecordHit {
  id: string;
  title: string;
  summary: string;
  savedAt: string;
}

export async function searchRecords(
  userId: string,
  q: string,
  limit = 10
): Promise<RecordHit[]> {
  const db = await getDb();
  const regex = new RegExp(escapeRegex(q), "i");
  const docs = await db
    .collection<RecordDoc>("records")
    .find({
      userId: new ObjectId(userId),
      $or: [{ title: regex }, { summary: regex }, { sourceText: regex }],
    })
    .sort({ savedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => ({
    id: doc._id!.toString(),
    title: doc.title,
    summary: doc.summary,
    savedAt: doc.savedAt.toISOString(),
  }));
}
