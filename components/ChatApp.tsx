"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import ConcludeButton from "./ConcludeButton";
import ConcludeModal from "./ConcludeModal";
import type {
  ChatImage,
  ChatMessage,
  ConcludeResult,
  ReportEvent,
  SessionConclusion,
} from "@/lib/types";
import { ModelMarkerParser } from "@/lib/markers";
import { createReportEvent, mergeReportEvents } from "@/lib/reportEvents";
import { maybeRenameHealthSession } from "@/lib/sessionTitle";
import {
  cleanDishNamesInReply,
  sanitizeConcludeMeals,
} from "@/lib/dishName";
import { elapsedSeconds, trimStreamingEnd } from "@/lib/format";
import {
  addGuestRecord,
  appendGuestMessage,
  createGuestSession,
  getGuestSession,
  startGuestPendingMessage,
  setGuestConclusion,
  truncateGuestSession,
  updateGuestMessage,
} from "@/lib/guestStore";
import { putGuestImage, getGuestImage } from "@/lib/guestImages";
import { STR, useUiLang } from "@/lib/i18n";
import { useInsulinMode, useReasoningEffort } from "@/lib/prefs";

interface UiMessage {
  id: number;
  role: "user" | "model";
  text: string;
  images?: ChatImage[];
  imageKeys?: string[];
  createdAt?: string;
  streaming?: boolean;
  failed?: boolean;
  model?: string;
  hideModelMeta?: boolean;
  trying?: string;
  processSteps?: string[];
  elapsed?: number;
  status?: "pending" | "complete" | "failed";
  startedAt?: string;
  updatedAt?: string;
  _id?: string;
  _index?: string;
}

type StoredStatus = "pending" | "complete" | "failed" | "done" | undefined;

function normalizeUiStatus(status: StoredStatus): "pending" | "complete" | "failed" | undefined {
  if (status === "done") return "complete";
  return status;
}

function trailKey(item: string): string {
  return item
    .replace(/\s*\(\+\d+\s+-\d+\)\s*$/, "")
    .replace(/\s*[\u2713\u2717]\s*$/, "")
    .trim()
    .toLowerCase();
}

function textTrailItems(text: string): string[] {
  const items: string[] = [];
  for (const raw of text.split("\n")) {
    const match = raw.match(/^\s*→\s+(.+)$/);
    if (match?.[1]?.trim()) items.push(match[1].trim());
  }
  return items;
}

function cleanSteps(steps: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of steps ?? []) {
    const clean = String(raw).replace(/^\s*→\s+/, "").trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

/** Internal process metadata must never become assistant-bubble content. */
function withRestoredTrail(text: string, steps: string[], pending: boolean): string {
  void steps;
  void pending;
  return text;
}

function appendProcessStep(steps: string[], label: string): string[] {
  const clean = label.replace(/^\s*→\s+/, "").trim();
  if (!clean) return steps;
  const key = trailKey(clean);
  if (steps.some((step) => trailKey(step) === key)) return steps;
  return [...steps, clean].slice(-80);
}

interface StoredLike {
  _id?: string;
  role: string;
  text: string;
  images?: ChatImage[];
  imageKeys?: string[];
  createdAt?: string;
  model?: string;
  trying?: string;
  elapsed?: number;
  status?: StoredStatus;
  processSteps?: string[];
}

interface ResumeAnimationState {
  messageId: string;
  displayedText: string;
  targetText: string;
  status: "pending" | "complete" | "failed";
  incoming: StoredLike;
  timer: ReturnType<typeof setInterval> | null;
}

function mapStoredMessages(
  list: StoredLike[],
  previous: UiMessage[] = []
): UiMessage[] {
  const previousById = new Map(
    previous
      .filter((message) => message._id)
      .map((message) => [message._id as string, message])
  );
  return list.map((message) => {
    const status = normalizeUiStatus(message.status) ?? "complete";
    const pending = status === "pending";
    const processSteps = cleanSteps(message.processSteps);
    const existing = message._id ? previousById.get(message._id) : undefined;
    return {
      id: existing?.id ?? nextId++,
      role: message.role === "model" ? "model" : "user",
      text: withRestoredTrail(
        visibleMessageText(message.text ?? ""),
        processSteps,
        pending
      ),
      images: message.images,
      imageKeys: message.imageKeys,
      createdAt: message.createdAt,
      model: message.model,
      hideModelMeta: pending,
      trying: undefined,
      processSteps,
      elapsed: message.elapsed,
      status,
      streaming: pending,
      failed: status === "failed",
      _id: message._id,
    };
  });
}

function mergeGuestRun(previous: UiMessage[], run: StoredLike): UiMessage[] {
  const mapped = mapStoredMessages([run], previous)[0];
  if (!mapped) return previous;
  const index = run._id
    ? previous.findIndex((message) => message._id === run._id)
    : -1;
  if (index >= 0) {
    const next = previous.slice();
    next[index] = { ...mapped, id: previous[index].id };
    return next;
  }
  const last = previous[previous.length - 1];
  if (last?.role === "model" && (last.streaming || last._id === run._id)) {
    return [...previous.slice(0, -1), { ...mapped, id: last.id }];
  }
  if (last?.role === "model" && (run.status ?? "complete") !== "pending") {
    return previous;
  }
  return [...previous, mapped];
}

function mergeStoredMessage(
  previous: UiMessage[],
  incoming: StoredLike,
  textOverride?: string,
  hideModelMetaOverride?: boolean
): UiMessage[] {
  const mapped = mapStoredMessages([incoming], previous)[0];
  if (!mapped) return previous;
  const nextMapped =
    textOverride === undefined && hideModelMetaOverride === undefined
      ? mapped
      : {
          ...mapped,
          ...(textOverride === undefined ? {} : { text: textOverride }),
          ...(hideModelMetaOverride === undefined
            ? {}
            : { hideModelMeta: hideModelMetaOverride }),
        };
  const index = incoming._id
    ? previous.findIndex((message) => message._id === incoming._id)
    : -1;
  if (index >= 0) {
    const current = previous[index];
    const unchanged =
      current.text === nextMapped.text &&
      current.model === nextMapped.model &&
      current.hideModelMeta === nextMapped.hideModelMeta &&
      current.trying === nextMapped.trying &&
      current.elapsed === nextMapped.elapsed &&
      current.status === nextMapped.status &&
      current.failed === nextMapped.failed &&
      (current.processSteps ?? []).join("\0") ===
        (nextMapped.processSteps ?? []).join("\0");
    if (unchanged) return previous;
    const next = previous.slice();
    next[index] = { ...nextMapped, id: current.id };
    return next;
  }
  const last = previous[previous.length - 1];
  if (last?.role === "model" && (last.streaming || last._id === incoming._id)) {
    return [...previous.slice(0, -1), { ...nextMapped, id: last.id }];
  }
  return [...previous, nextMapped];
}

let nextId = 1;

function toApiMessages(messages: UiMessage[]): ChatMessage[] {
  return messages
    .filter(
      (message) =>
        !message.failed && (message.text || (message.images?.length ?? 0) > 0)
    )
    .map(({ role, text, images }) => ({ role, text, images }));
}

function persistMessage(
  sessionId: string,
  message: {
    role: "user" | "model";
    text: string;
    imageKeys?: string[];
    model?: string;
    elapsed?: number;
  }
) {
  fetch(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  }).catch(() => {});
}

async function storeLocalImages(
  sessionId: string,
  messageId: number,
  images: ChatImage[] | undefined
): Promise<string[] | undefined> {
  if (!images?.length) return undefined;
  const keys = images.map((_, index) => `${sessionId}:${messageId}:${index}`);
  const stored = await Promise.all(
    keys.map((key, index) => putGuestImage(key, images[index]))
  );
  const kept = keys.filter((_, index) => stored[index]);
  return kept.length > 0 ? kept : undefined;
}

function titleFrom(text: string, fallback: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? `${clean.slice(0, 60)}…` : clean || fallback;
}

function visibleMessageText(text: string): string {
  const concludeIndex = text.indexOf("<CONCLUDE>");
  const visible = trimStreamingEnd(
    concludeIndex === -1 ? text : text.slice(0, concludeIndex)
  );
  return cleanDishNamesInReply(
    visible
      .split("\n")
      .filter((line) => !/^\s*→\s+\S+/.test(line))
      .join("\n")
      .trimEnd()
  );
}

function parseConclusionTail(
  text: string
): { result: ConcludeResult; sourceText: string } | null {
  const match = text.match(/<CONCLUDE>([\s\S]*?)<\/CONCLUDE>/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[1]) as Record<string, unknown>;
    if (!raw || typeof raw !== "object") return null;
    return {
      result: {
        title: typeof raw.title === "string" ? raw.title : "",
        summary: typeof raw.summary === "string" ? raw.summary : "",
        items: Array.isArray(raw.items)
          ? (raw.items as ConcludeResult["items"])
          : [],
        meals: Array.isArray(raw.meals)
          ? sanitizeConcludeMeals(raw.meals as ConcludeResult["meals"])
          : undefined,
      },
      sourceText: visibleMessageText(text),
    };
  } catch {
    return null;
  }
}

function eventForLatestUser(
  result: ConcludeResult,
  messages: UiMessage[]
): ReportEvent | null {
  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  if (!latestUser) return null;
  const sourceMessageId = latestUser._id ?? `ui:${latestUser.id}`;
  return createReportEvent(
    result,
    sourceMessageId,
    latestUser.createdAt ?? new Date().toISOString(),
    latestUser.imageKeys
  );
}

export default function ChatApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  const lang = useUiLang();
  const t = STR[lang];
  const [insulinMode, toggleInsulinMode] = useInsulinMode();
  const [reasoningEffort] = useReasoningEffort();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [concludeDraft, setConcludeDraft] = useState<{
    result: ConcludeResult;
    sourceText: string;
  } | null>(null);
  const [concludeResult, setConcludeResult] = useState<{
    result: ConcludeResult;
    sourceText: string;
  } | null>(null);
  const [concludeSaved, setConcludeSaved] = useState(false);
  const concludeResultRef = useRef<{
    result: ConcludeResult;
    sourceText: string;
  } | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  const resumeAnimationRef = useRef<ResumeAnimationState | null>(null);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    concludeResultRef.current = concludeResult;
  }, [concludeResult]);

  const stopResumeAnimation = useCallback(() => {
    const animation = resumeAnimationRef.current;
    if (animation?.timer) clearInterval(animation.timer);
    resumeAnimationRef.current = null;
  }, []);

  // The single aggregate report this chat owns. Its event list keeps each
  // extracted message/date/image association independently.
  const recordIdRef = useRef<string | null>(null);

  // Merge the latest event into the accumulated conclusion. The model tail is
  // intentionally latest-message-only; persisted events retain earlier data.
  const mergeConclusion = useCallback(
    (next: ConcludeResult, nextEvent?: ReportEvent | null): ConcludeResult => {
      const base = concludeResultRef.current?.result;
      if (!base) {
        return {
          ...next,
          events: mergeReportEvents(next.events, nextEvent ?? undefined),
        };
      }
      const meals = [...(base.meals ?? [])];
      for (const meal of next.meals ?? []) {
        const existing = meals.find(
          (m) => m.name === meal.name && m.time === meal.time
        );
        if (existing) {
          const dishNames = new Set((existing.dishes ?? []).map((d) => d.name));
          const fresh = (meal.dishes ?? []).filter((d) => !dishNames.has(d.name));
          if (fresh.length) {
            existing.dishes = [...(existing.dishes ?? []), ...fresh];
          }
        } else {
          meals.push({ ...meal, dishes: meal.dishes ? [...meal.dishes] : undefined });
        }
      }
      const items = [...(base.items ?? [])];
      for (const item of next.items ?? []) {
        // Keep every distinct reading from each message.
        if (
          !items.some(
            (existing) => existing.name === item.name && existing.value === item.value
          )
        ) {
          items.push({ ...item });
        }
      }
      return {
        title: next.title || base.title,
        summary: next.summary || base.summary,
        items,
        meals,
        imageKeys: base.imageKeys ?? next.imageKeys,
        events: mergeReportEvents(base.events, nextEvent ?? undefined),
      };
    },
    []
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const persistConclusionRecord = useCallback(
    async (
      result: ConcludeResult,
      sourceText: string
    ): Promise<string | null> => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return null;
      const payload = {
        title: result.title.trim() || t["summary.report"],
        summary: result.summary ?? "",
        items: result.items,
        meals: result.meals,
        sourceText,
        imageKeys: result.imageKeys ?? undefined,
        events: result.events,
        sessionId,
      };
      let savedRecordId = recordIdRef.current;
      try {
        if (isAuthed) {
          const save = async (id: string | null) => {
            const response = await fetch(
              `/api/records${id ? `?id=${encodeURIComponent(id)}` : ""}`,
              {
                method: id ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
            if (!response.ok) throw new Error("Could not save the report.");
            return (await response.json())?.record?._id ?? id;
          };
          try {
            savedRecordId = await save(savedRecordId);
          } catch (error) {
            if (!savedRecordId) throw error;
            savedRecordId = await save(null);
          }
          if (!savedRecordId) throw new Error("The saved report has no id.");
          recordIdRef.current = savedRecordId;
          const saveSession = async (body: object) => {
            const response = await fetch(`/api/sessions/${sessionId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error("Could not save the report.");
          };
          await saveSession({ conclusion: payload });
          await saveSession({ recordId: savedRecordId });
        } else {
          const record = addGuestRecord(payload);
          savedRecordId = record.id;
          recordIdRef.current = savedRecordId;
          setGuestConclusion(sessionId, payload, savedRecordId);
        }
        setSummaryError(null);
        return savedRecordId;
      } catch {
        setSummaryError(t["summary.saveFailed"]);
        return null;
      }
    },
    [isAuthed, t]
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingImages, setEditingImages] = useState<ChatImage[]>([]);
  // const [shareMsg, setShareMsg] = useState<"link" | "error" | null>(null); // share feature removed
  const [flashId, setFlashId] = useState<number | null>(null);
  const handledMsgRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionTitleRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [freeNotice, setFreeNotice] = useState(false);

  // Free-model notice: centered gray text, auto-dismisses after a few seconds.
  useEffect(() => {
    if (!freeNotice) return;
    const timer = setTimeout(() => setFreeNotice(false), 6000);
    return () => clearTimeout(timer);
  }, [freeNotice]);

  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResume = useCallback(() => {
    if (resumeTimerRef.current) {
      clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    stopResumeAnimation();
  }, [stopResumeAnimation]);

  const animateResumeSnapshot = useCallback(
    (
      messageId: string,
      incoming: StoredLike,
      status: "pending" | "complete" | "failed",
      initialText = ""
    ) => {
      const targetText = visibleMessageText(incoming.text ?? "");
      let animation = resumeAnimationRef.current;
      if (!animation || animation.messageId !== messageId) {
        animation = {
          messageId,
          displayedText: visibleMessageText(initialText),
          targetText: targetText.length >= initialText.length ? targetText : visibleMessageText(initialText),
          status,
          incoming,
          timer: null,
        };
        resumeAnimationRef.current = animation;
      } else {
        if (targetText.length >= animation.targetText.length) {
          animation.targetText = targetText;
        }
        animation.status = status;
        animation.incoming = incoming;
      }

      const renderNext = () => {
        const current = resumeAnimationRef.current;
        if (!current || current.messageId !== messageId) return;
        const remaining = current.targetText.length - current.displayedText.length;
        if (remaining > 0) {
          const step = Math.min(
            remaining,
            Math.max(2, Math.min(16, Math.ceil(remaining / 8)))
          );
          current.displayedText = current.targetText.slice(
            0,
            current.displayedText.length + step
          );
        }
        setMessages((previous) =>
          mergeStoredMessage(
            previous,
            { ...current.incoming, status: current.status },
            current.displayedText,
            current.status === "pending" ||
              current.displayedText.length < current.targetText.length
          )
        );
        if (remaining <= 0 && current.status !== "pending") {
          stopResumeAnimation();
        }
      };

      renderNext();
      if (!animation.timer) {
        animation.timer = setInterval(renderNext, 24);
      }
    },
    [stopResumeAnimation]
  );

  const startResume = useCallback(
    (id: string, messageId: string, initialText = "") => {
      stopResume();
      setSending(true);
      let polling = false;
      const tick = async () => {
        if (polling) return;
        if (sessionIdRef.current !== id) {
          stopResume();
          return;
        }
        polling = true;
        try {
          const response = await fetch(
            `/api/chat?sessionId=${encodeURIComponent(id)}&messageId=${encodeURIComponent(
              messageId
            )}&resumeAt=${Date.now()}`,
            {
              cache: "no-store",
            }
          );
          if (!response.ok) return;
          const body = (await response.json()) as { message?: StoredLike };
          const incoming = body.message;
          if (!incoming || sessionIdRef.current !== id) return;
          const status = normalizeUiStatus(incoming.status) ?? "pending";
          animateResumeSnapshot(
            messageId,
            { ...incoming, status },
            status,
            initialText
          );
          if (!isAuthed) {
            updateGuestMessage(id, messageId, {
              text: visibleMessageText(incoming.text ?? ""),
              model: incoming.model,
              elapsed: incoming.elapsed,
              status,
              processSteps: cleanSteps(incoming.processSteps),
            });
          }
          if (status !== "pending") {
            const restored = parseConclusionTail(incoming.text ?? "");
            if (restored) {
              const merged = mergeConclusion(
                restored.result,
                eventForLatestUser(restored.result, messagesRef.current)
              );
              const savedRecordId = await persistConclusionRecord(
                merged,
                restored.sourceText
              );
              setConcludeSaved(Boolean(savedRecordId));
              setConcludeResult({
                result: merged,
                sourceText: restored.sourceText,
              });
            }
            setSending(false);
            if (resumeTimerRef.current) {
              clearInterval(resumeTimerRef.current);
              resumeTimerRef.current = null;
            }
          }
        } catch {
          // Retry on the next interval; the run itself remains server-owned.
        } finally {
          polling = false;
        }
      };
      void tick();
      resumeTimerRef.current = setInterval(() => {
        void tick();
      }, 500);
    },
    [
      isAuthed,
      animateResumeSnapshot,
      mergeConclusion,
      persistConclusionRecord,
      stopResume,
    ]
  );

  const startGuestResume = useCallback(
    (id: string, messageId: string, initialText = "") => {
      startResume(id, messageId, initialText);
    },
    [startResume]
  );

  useEffect(() => stopResume, [stopResume]);

  // Auth state refresh: runs on mount, on URL changes, and when the sidebar
// signals login/logout ("inschat-auth") — ChatApp never remounts for those,
// so the initial check alone leaves isAuthed stale and messages silently go
// to the guest store.
useEffect(() => {
  let alive = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const check = () =>
    fetch("/api/auth/me", { signal: controller.signal })
      .then((response) => {
        if (alive) setIsAuthed(response.status === 200);
      })
      .catch(() => {
        if (alive) setIsAuthed(false);
      });
  check().finally(() => clearTimeout(timer));
  const onAuth = () => {
    const ctrl = new AbortController();
    fetch("/api/auth/me", { signal: ctrl.signal })
      .then((response) => {
        if (alive) setIsAuthed(response.status === 200);
      })
      .catch(() => {
        if (alive) setIsAuthed(false);
      });
  };
  window.addEventListener("inschat-auth", onAuth);
  return () => {
    alive = false;
    controller.abort();
    clearTimeout(timer);
    window.removeEventListener("inschat-auth", onAuth);
  };
}, [searchParams]);

  /*
   * The remainder of this effect is kept below in the existing session
   * hydration path.
   */

  useEffect(() => {
    if (isAuthed === null) return;
    const id = sessionParam;
    if (id && sessionIdRef.current === id) {
      // Same session we're already viewing (router.replace from send()) —
      // keep live state, don't reset/refetch.
      setLoading(false);
      return;
    }
    setMessages([]);
    setConcludeResult(null);
    setConcludeSaved(false);
    recordIdRef.current = null;
    if (!id) {
      sessionIdRef.current = null;
      sessionTitleRef.current = null;
      setLoading(false);
      return;
    }
    if (isAuthed) {
      sessionIdRef.current = id;
      setLoading(true);
      fetch(`/api/sessions/${id}`)
        .then((response) => {
          if (!response.ok) throw new Error("not found");
          return response.json();
        })
        .then(
          (body: {
            session?: { title?: string };
            messages: {
              role: string;
              text: string;
              imageKeys?: string[];
              createdAt?: string;
              model?: string;
              trying?: string;
              elapsed?: number;
              status?: "pending" | "complete" | "failed";
              processSteps?: string[];
              startedAt?: string;
              updatedAt?: string;
            }[];
            conclusion?: SessionConclusion | null;
            recordId?: string | null;
          }) => {
            if (sessionIdRef.current !== id) return;
            sessionTitleRef.current = body.session?.title ?? null;
            return Promise.all(body.messages.map(async (message) => {
                const status = normalizeUiStatus(
                  (message as { status?: StoredStatus }).status ??
                    (message.status as StoredStatus)
                );
                const pending = status === "pending";
                const processSteps = cleanSteps(
                  (message as { processSteps?: string[] }).processSteps
                );
                const rawText = visibleMessageText(message.text);
                const images = message.imageKeys?.length
                  ? (
                      await Promise.all(
                        message.imageKeys.map(async (key) => (await getGuestImage(key)) ?? null)
                      )
                    ).filter((image): image is ChatImage => image !== null)
                  : undefined;
                return {
                  id: nextId++,
                  role: (message.role === "model" ? "model" : "user") as "user" | "model",
                  text: withRestoredTrail(rawText, processSteps, pending),
                  images,
                  imageKeys: message.imageKeys,
                  model: message.model,
                  hideModelMeta: pending,
                  trying: undefined,
                  processSteps,
                  elapsed: message.elapsed,
                  status,
                  streaming: pending,
                  failed: status === "failed",
                  startedAt: message.startedAt,
                  updatedAt: message.updatedAt,
                  _id: (message as { _id?: string })._id,
                };
              })).then((hydrated) => {
            if (sessionIdRef.current !== id) return;
            setMessages(hydrated);
            setSending(hydrated.some((message) => message.status === "pending"));
            const pendingStored = [...(body.messages as StoredLike[])]
              .reverse()
              .find(
                (message) =>
                  message.role === "model" &&
                  normalizeUiStatus(message.status) === "pending" &&
                  Boolean(message._id)
              );
            if (pendingStored?._id) {
              startResume(
                id,
                pendingStored._id,
                visibleMessageText(pendingStored.text)
              );
            } else {
              stopResume();
            }
            // Restore the saved conclusion (and its record link when known)
            // so the button opens the stored report instead of re-running
            // conclude. Older sessions may lack recordId — still restore.
            if (body.conclusion) {
              recordIdRef.current = body.recordId ?? null;
              setConcludeSaved(true);
              setConcludeResult({
                result: {
                  title: body.conclusion.title,
                  summary: body.conclusion.summary,
                  items: body.conclusion.items,
                  meals: body.conclusion.meals,
                  imageKeys: body.conclusion.imageKeys,
                  events: body.conclusion.events,
                },
                sourceText: body.conclusion.sourceText ?? "",
              });
            }
          });
          }
        )
        .catch(() => {
          sessionIdRef.current = null;
          sessionTitleRef.current = null;
          router.replace("/");
        })
        .finally(() => {
          if (sessionIdRef.current === id) setLoading(false);
        });
    } else {
      const local = getGuestSession(id);
      if (local) {
        sessionIdRef.current = id;
        sessionTitleRef.current = local.title;
        Promise.all(
          local.messages.map(async (message, index) => {
            const status = normalizeUiStatus(message.status as StoredStatus);
            const pending = status === "pending";
            const images = message.images?.length
              ? message.images
              : message.imageKeys?.length
                ? (
                    await Promise.all(
                      message.imageKeys.map(async (key) => (await getGuestImage(key)) ?? null)
                    )
                  ).filter((image): image is ChatImage => image !== null)
                : undefined;
            return {
              id: nextId++,
              role: (message.role === "model" ? "model" : "user") as "user" | "model",
              text: visibleMessageText(message.text),
              images,
              imageKeys: message.imageKeys,
              createdAt: message.createdAt
                ? new Date(message.createdAt).toISOString()
                : undefined,
              model: message.model,
              hideModelMeta: pending,
              trying: undefined,
              elapsed: message.elapsed,
              status,
              streaming: pending,
              failed: status === "failed",
              processSteps: cleanSteps((message as { processSteps?: string[] }).processSteps),
              startedAt: message.startedAt
                ? new Date(message.startedAt).toISOString()
                : undefined,
              updatedAt: message.updatedAt
                ? new Date(message.updatedAt).toISOString()
                : undefined,
              _id: message.id,
              _index: String(index),
            };
          })
        ).then(async (hydrated) => {
          if (sessionIdRef.current !== id) return;
          setMessages(hydrated);
          setSending(hydrated.some((message) => message.status === "pending"));
          // Rejoin a server-side guest run after refresh (trail + pending).
          try {
            const response = await fetch(`/api/guest-runs/${id}`);
            if (!response.ok || sessionIdRef.current !== id) return;
            const body = (await response.json()) as {
              run?: {
                _id?: string;
                text?: string;
                model?: string;
                trying?: string;
                elapsed?: number;
                status?: StoredStatus;
                processSteps?: string[];
              } | null;
            };
            const run = body.run;
            if (!run || sessionIdRef.current !== id) return;
            const status = normalizeUiStatus(run.status) ?? "complete";
            const pending = status === "pending";
            const processSteps = cleanSteps(run.processSteps);
            const text = withRestoredTrail(
              visibleMessageText(run.text ?? ""),
              processSteps,
              pending
            );
            setMessages((prev) => {
              const byId = run._id
                ? prev.findIndex((message) => message._id === run._id)
                : -1;
              const mapped: UiMessage = {
                id: byId >= 0 ? prev[byId].id : nextId++,
                role: "model",
                text,
                model: run.model,
                hideModelMeta: pending,
                trying: undefined,
                processSteps,
                elapsed: run.elapsed,
                status,
                streaming: pending,
                failed: status === "failed",
                _id: run._id,
              };
              if (byId >= 0) {
                const next = prev.slice();
                next[byId] = mapped;
                return next;
              }
              const last = prev[prev.length - 1];
              if (last?.role === "model" && (last.streaming || last._id === run._id)) {
                return [...prev.slice(0, -1), { ...mapped, id: last.id }];
              }
              if (last?.role === "model" && !pending) return prev;
              return [...prev, mapped];
            });
            setSending(pending);
            const pendingLocal = hydrated.find(
              (message) => message.status === "pending" && message._id
            );
            const resumeId = run?._id ?? pendingLocal?._id;
            if ((pending || pendingLocal) && resumeId) {
              startGuestResume(
                id,
                resumeId,
                visibleMessageText(run?.text ?? pendingLocal?.text ?? "")
              );
            } else {
              stopResume();
            }
            if (!pending && run._id) {
              updateGuestMessage(id, run._id, {
                text,
                model: run.model,
                elapsed: run.elapsed,
                status,
              });
            }
          } catch {
            /* local user prompt still shows */
          }
        });
        if (local.conclusion) {
          recordIdRef.current = local.recordId ?? null;
          setConcludeSaved(true);
          setConcludeResult({
            result: {
              title: local.conclusion.title,
              summary: local.conclusion.summary,
              items: local.conclusion.items,
              meals: local.conclusion.meals,
              imageKeys: local.conclusion.imageKeys,
              events: local.conclusion.events,
            },
            sourceText: local.conclusion.sourceText ?? "",
          });
        }
      } else {
        sessionIdRef.current = null;
        router.replace("/");
      }
      setLoading(false);
    }
  }, [
    sessionParam,
    isAuthed,
    router,
    startResume,
    startGuestResume,
    stopResume,
  ]);

  // Usage-limit banner removed (2026-09-02): exhaustion now falls back to
// free models for text, and image sends get the reply-text explanation.

  // Search jump: flash + scroll to the matched message, then clear ?msg.
  useEffect(() => {
    const target = searchParams.get("msg");
    if (!target || handledMsgRef.current === target || messages.length === 0) return;
    const match = messages.find(
      (message) => message._id === target || message._index === target
    );
    if (!match) return;
    handledMsgRef.current = target;
    setFlashId(match.id);
    setTimeout(() => {
      document
        .getElementById(`msg-${match.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    setTimeout(() => setFlashId(null), 2600);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("msg");
    router.replace(`/?${params.toString()}`);
  }, [searchParams, messages, router]);

  // Streams a model reply for the given message list (which already ends
  // with the user message that triggers it).
  const streamReply = useCallback(
    async (base: UiMessage[]) => {
      const sessionId = sessionIdRef.current;
      const pendingMessageId =
        !isAuthed && sessionId
          ? startGuestPendingMessage(sessionId) ?? undefined
          : undefined;
      const modelMessage: UiMessage = {
        id: nextId++,
        role: "model",
        text: "",
        streaming: true,
        elapsed: 0,
        status: "pending",
        processSteps: [],
        _id: pendingMessageId,
      };
      setMessages([...base, modelMessage]);
      setSending(true);
      setFreeNotice(false);

      const startedAt = Date.now();
      let elapsedValue = 0;
      let contentStarted = false;
      const elapsedTimer = setInterval(() => {
        elapsedValue = elapsedSeconds(startedAt);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === modelMessage.id
              ? { ...message, elapsed: elapsedValue }
              : message
          )
        );
      }, 100);

      // The reply is perceived as "done" once the first words arrive — freeze
      // the elapsed timer there instead of counting the whole stream tail
      // (the model keeps streaming reasoning/health tail for seconds after).
      const freezeElapsed = () => {
        if (!contentStarted) {
          contentStarted = true;
          elapsedValue = elapsedSeconds(startedAt);
          clearInterval(elapsedTimer);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === modelMessage.id
                ? { ...message, elapsed: elapsedValue }
                : message
            )
          );
        }
      };

      const controller = new AbortController();
      abortRef.current = controller;
      const history = toApiMessages(base);
      let aborted = false;
      let parsedConclude: ConcludeResult | null = null;
      let runPersisted = false;
      let runMessageId: string | null = null;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: lang,
            mode: insulinMode ? "preset" : "free",
            includeImages: insulinMode,
            reasoning: reasoningEffort,
            sessionId,
            pendingMessageId,
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          await response.text();
          throw new Error(t["chat.requestFailed"]);
        }
        runPersisted = response.headers.get("x-run-persisted") === "1";
        runMessageId =
          response.headers.get("x-run-message-id") || pendingMessageId || null;
        if (runMessageId) {
          const storeId = runMessageId;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === modelMessage.id
                ? { ...message, _id: storeId, processSteps: message.processSteps ?? [] }
                : message
            )
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const parser = new ModelMarkerParser();
        let modelText = "";
        let modelName: string | undefined;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const { text, model, trying, free } = parser.push(
            decoder.decode(value, { stream: true })
          );
          if (free) {
            setFreeNotice(true);
          }
          if (model) {
            modelName = model;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === modelMessage.id
                  ? { ...message, model: modelName, trying: undefined }
                  : message
              )
            );
          } else if (trying) {
            setMessages((prev) =>
              prev.map((message) => {
                if (message.id !== modelMessage.id) return message;
                const steps = appendProcessStep(message.processSteps ?? [], trying);
                return {
                  ...message,
                  trying,
                  processSteps: steps,
                };
              })
            );
          }
          if (text) {
            freezeElapsed();
            modelText += text;
            // Health-mode replies end with a <CONCLUDE> JSON tail for the
            // single-call recording flow — hide it from the bubble.
            const openIdx = modelText.indexOf("<CONCLUDE>");
            const visible = cleanDishNamesInReply(
              trimStreamingEnd(
                openIdx === -1 ? modelText : modelText.slice(0, openIdx)
              )
            );
            setMessages((prev) =>
              prev.map((message) =>
                message.id === modelMessage.id
                  ? { ...message, text: visible }
                  : message
              )
            );
          }
        }
        const tail = parser.flush();
        if (tail) {
          modelText += tail;
          const openIdx = modelText.indexOf("<CONCLUDE>");
          const visible = cleanDishNamesInReply(
            trimStreamingEnd(
              openIdx === -1 ? modelText : modelText.slice(0, openIdx)
            )
          );
          setMessages((prev) =>
            prev.map((message) =>
              message.id === modelMessage.id
                ? { ...message, text: visible }
                : message
            )
          );
        }
        if (!contentStarted) elapsedValue = elapsedSeconds(startedAt);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === modelMessage.id
              ? {
                  ...message,
                  streaming: false,
                  status: "complete",
                  elapsed: elapsedValue,
                }
              : message
          )
        );

        // Single-call recording: in health mode the reply itself carries the
        // <CONCLUDE> JSON tail — parse it instead of calling /api/conclude.
        let savedText = modelText;
        if (insulinMode) {
          const match = modelText.match(/<CONCLUDE>([\s\S]*?)<\/CONCLUDE>/);
          if (match) {
            const visibleText = cleanDishNamesInReply(
              modelText.slice(0, match.index).trimEnd()
            );
            savedText = visibleText;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === modelMessage.id
                  ? { ...message, text: visibleText }
                  : message
              )
            );
            try {
              const raw = JSON.parse(match[1]) as Record<string, unknown>;
              if (raw && typeof raw === "object") {
                parsedConclude = {
                  title:
                    typeof raw.title === "string" ? raw.title : t["summary.report"],
                  summary:
                    typeof raw.summary === "string" ? raw.summary : "",
                  items: Array.isArray(raw.items) ? (raw.items as ConcludeResult["items"]) : [],
                  meals: Array.isArray(raw.meals)
                    ? sanitizeConcludeMeals(raw.meals as ConcludeResult["meals"])
                    : undefined,
                };
              }
            } catch {
              parsedConclude = null;
            }
          }
          if (parsedConclude) {
            const merged = mergeConclusion(
              parsedConclude,
              eventForLatestUser(parsedConclude, base)
            );
            const savedRecordId = await persistConclusionRecord(merged, savedText);
            setConcludeSaved(Boolean(savedRecordId));
            setConcludeResult({ result: merged, sourceText: savedText });
          }
        }
        if (sessionId) {
          if (!isAuthed && (pendingMessageId || runMessageId)) {
            updateGuestMessage(sessionId, (runMessageId || pendingMessageId) as string, {
              text: savedText,
              model: modelName,
              elapsed: elapsedValue,
              status: "complete",
            });
          } else if (!isAuthed) {
            appendGuestMessage(sessionId, {
              role: "model",
              text: savedText,
              model: modelName,
              elapsed: elapsedValue,
            });
          }
          // Clean end + server-owned persistence: this tab closes its own
          // pending placeholder if the handler dies at exactly that moment.
          const renamed = await maybeRenameHealthSession({
            sessionId,
            authed: Boolean(isAuthed),
            insulinMode,
            currentTitle: sessionTitleRef.current,
            lang,
            result: parsedConclude,
            replyText: savedText,
          });
          if (renamed) sessionTitleRef.current = renamed;
          if (runPersisted) {
            if (isAuthed && runMessageId) {
              fetch(`/api/sessions/${sessionId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  finalizePending: true,
                  messageId: runMessageId,
                  text: savedText,
                  elapsed: elapsedValue,
                }),
              }).catch(() => {});
            } else if (!isAuthed) {
              fetch(`/api/guest-runs/${sessionId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: savedText,
                  elapsed: elapsedValue,
                  messageId: runMessageId || pendingMessageId,
                }),
              }).catch(() => {});
            }
          }
        }
      } catch (error) {
        aborted = error instanceof DOMException && error.name === "AbortError";
        setMessages((prev) =>
          prev.map((message) =>
            message.id === modelMessage.id
              ? {
                  ...message,
                  streaming: false,
                  failed: !aborted,
                  status: aborted ? "pending" : "failed",
                  text: aborted
                    ? message.text
                     : message.text || (error instanceof Error ? error.message : t["chat.requestFailed"]),
                }
              : message
          )
        );
      } finally {
        clearInterval(elapsedTimer);
        setSending(false);
        abortRef.current = null;
      }
    },
    [
      isAuthed,
      lang,
      insulinMode,
      mergeConclusion,
      persistConclusionRecord,
      reasoningEffort,
    ]
  );

  const send = useCallback(
    async (text: string, images?: ChatImage[]) => {
      const trimmed = text.trim();
      if ((!trimmed && (images?.length ?? 0) === 0) || sending || isAuthed === null) return;
      const authed = isAuthed;

      let sessionId = sessionIdRef.current;
      if (!sessionId) {
        const createdTitle = titleFrom(trimmed, t["nav.newChat"]);
        if (authed) {
          try {
            const response = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: createdTitle }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(t["common.requestFailed"]);
            sessionId = body.session._id;
          } catch {
            sessionId = null;
          }
        } else {
          sessionId = createGuestSession(createdTitle).id;
        }
        if (sessionId) {
          sessionIdRef.current = sessionId;
          sessionTitleRef.current = createdTitle;
          router.replace(`/?session=${sessionId}`);
        }
      }

      const userMessageId = nextId++;
      const createdAt = new Date().toISOString();
      const imageKeys = sessionId
        ? await storeLocalImages(sessionId, userMessageId, images)
        : undefined;
      const userMessage: UiMessage = {
        id: userMessageId,
        role: "user",
        text: trimmed,
        images,
        imageKeys,
        createdAt,
      };
      if (sessionId) {
        if (authed) {
          persistMessage(sessionId, { role: "user", text: trimmed, imageKeys });
        } else if (images && images.length > 0) {
          appendGuestMessage(sessionId, {
            role: "user",
            text: trimmed,
            images: imageKeys?.length === images.length ? undefined : images,
            imageKeys,
            createdAt: Date.parse(createdAt),
          });
        } else {
          appendGuestMessage(sessionId, {
            role: "user",
            text: trimmed,
            createdAt: Date.parse(createdAt),
          });
        }
      }
      await streamReply([...messages, userMessage]);
    },
    [messages, sending, isAuthed, router, streamReply]
  );

  // Truncate persisted state up to the given message list (revert-style).
  const truncatePersisted = useCallback(
    async (base: UiMessage[]) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      const keep = base.filter(
        (message) => message.role === "user" || !message.failed
      ).length;
      if (isAuthed) {
        await fetch(`/api/sessions/${sessionId}/messages`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keep }),
        }).catch(() => {});
      } else {
        truncateGuestSession(sessionId, keep);
      }
    },
    [isAuthed]
  );

  const startEdit = useCallback(
    (id: number) => {
      const message = messages.find((m) => m.id === id);
      if (!message || message.role !== "user") return;
      setEditingId(id);
      setEditingText(message.text);
      setEditingImages(message.images ?? []);
    },
    [messages]
  );

  const editSave = useCallback(
    async (id: number) => {
      const index = messages.findIndex((m) => m.id === id);
      if (index < 0 || !editingText.trim()) return;
      const sessionId = sessionIdRef.current;
      const editedImages = editingImages.length > 0 ? editingImages : undefined;
      const imageKeys = sessionId
        ? await storeLocalImages(sessionId, id, editedImages)
        : undefined;
      const edited: UiMessage = {
        ...messages[index],
        text: editingText.trim(),
        images: editedImages,
        imageKeys,
      };
      const base = messages.slice(0, index);
      setEditingId(null);
      setEditingImages([]);
      await truncatePersisted(base);
      if (sessionId) {
        if (isAuthed) {
          persistMessage(sessionId, {
            role: "user",
            text: edited.text,
            imageKeys: edited.imageKeys,
          });
        } else {
          appendGuestMessage(sessionId, {
            role: "user",
            text: edited.text,
            images:
              imageKeys?.length === editedImages?.length ? undefined : editedImages,
            imageKeys,
          });
        }
      }
      await streamReply([...base, edited]);
    },
    [messages, editingText, editingImages, isAuthed, truncatePersisted, streamReply]
  );

  const regenerate = useCallback(
    async (id: number) => {
      const index = messages.findIndex((m) => m.id === id);
      if (index < 1) return;
      const previous = messages[index - 1];
      if (previous.role !== "user") return;
      const base = messages.slice(0, index);
      await truncatePersisted(base);
      await streamReply(base);
    },
    [messages, truncatePersisted, streamReply]
  );

/* Share feature removed (2026-08-30).
  const createShare = useCallback(
    async (kind: "chat" | "message", title: string, list: UiMessage[]) => {
      const payload = list
        .filter((m) => (m.role === "user" || !m.failed) && (m.text || m.image))
        .map((m) => ({
          role: m.role,
          text: m.text,
          image: m.image,
          model: m.model,
          elapsed: m.elapsed,
        }));
      try {
        const response = await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, title, messages: payload }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "Share failed.");
        await navigator.clipboard.writeText(`${location.origin}/share/${body.token}`);
        setShareMsg("link");
      } catch {
        setShareMsg("error");
      }
      setTimeout(() => setShareMsg(null), 2500);
    },
    []
  );

  const shareMessage = useCallback(
    (id: number) => {
      const message = messages.find((m) => m.id === id);
      if (!message) return;
      void createShare("message", titleFrom(message.text || "Message"), [message]);
    },
    [messages, createShare]
  );

  const shareChat = useCallback(() => {
    const list = messages.filter(
      (m) => (m.role === "user" || !m.failed) && (m.text || m.image)
    );
    if (!list.length) return;
    const firstUser = list.find((m) => m.role === "user");
    void createShare("chat", titleFrom(firstUser?.text ?? "Chat"), list.slice(-20));
  }, [messages, createShare]);
*/

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

/* Revert feature commented out (2026-08-30) — edit/regenerate replaced it.
  // Revert: drop everything after the chosen message (locally + persisted).
  const revertTo = useCallback(
    async (id: number) => {
      if (sending) return;
      const index = messages.findIndex((message) => message.id === id);
      if (index < 0 || index >= messages.length - 1) return;
      const kept = messages.slice(0, index + 1);
      // Only successfully persisted messages count toward the server's list:
      // user messages always persist; model messages persist only when ok.
      const keep = kept.filter(
        (message) => message.role === "user" || !message.failed
      ).length;
      setMessages(kept);
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      if (isAuthed) {
        fetch(`/api/sessions/${sessionId}/messages`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keep }),
        }).catch(() => {});
      } else {
        truncateGuestSession(sessionId, keep);
      }
    },
    [messages, sending, isAuthed]
  );
*/

  const concludeReady = concludeResult !== null;
  const sessionImageKeys = [
    ...new Set(messages.flatMap((message) => message.imageKeys ?? [])),
  ];

  return (
    <div className="app">
      {loading ? (
        <main className="messages">
          <p className="empty">{t["records.loading"]}</p>
        </main>
      ) : messages.length === 0 ? (
        <main className="welcome">
          <h2>{t["welcome.title"]}</h2>
          <div className="composer-toggles">
            <button
              type="button"
              className={`composer-toggle${insulinMode ? " active" : ""}`}
              onClick={() => toggleInsulinMode(!insulinMode)}
              aria-pressed={insulinMode}
            >
              {t["settings.insulinMode"]}
            </button>
          </div>
          <Composer
            onSend={send}
            onStop={stop}
            sending={sending}
          />
        </main>
      ) : (
        <MessageBubble
          messages={messages}
          guest={isAuthed === false}
          flashId={flashId}
          onEdit={startEdit}
          onRegenerate={regenerate}
          canAct={!sending}
          editingId={editingId}
          editingText={editingText}
          editingImages={editingImages}
          onEditingText={setEditingText}
          onEditingImages={setEditingImages}
          onEditSave={editSave}
          onEditCancel={() => {
            setEditingId(null);
            setEditingImages([]);
          }}
        />
      )}
      {messages.length > 0 && (
        <div className="composer-toggles bottom">
          <button
            type="button"
            className={`composer-toggle${insulinMode ? " active" : ""}`}
            onClick={() => toggleInsulinMode(!insulinMode)}
            aria-pressed={insulinMode}
          >
            {t["settings.insulinMode"]}
          </button>
          {summaryError && <p className="conclusion-error">{summaryError}</p>}
          <ConcludeButton
            onClick={() => {
              if (concludeReady) setConcludeDraft(concludeResult);
            }}
            ready={concludeReady}
            disabled={!concludeReady || sending}
          />
        </div>
      )}
      {freeNotice && (
        <p className="free-note-overlay" onClick={() => setFreeNotice(false)}>
          {t["free.notice"]}
        </p>
      )}
      {messages.length > 0 && (
        <Composer
          onSend={send}
          onStop={stop}
          sending={sending}
        />
      )}
      <ConcludeModal
        open={concludeDraft !== null}
        result={concludeDraft?.result ?? null}
        sourceText={concludeDraft?.sourceText ?? ""}
        guest={isAuthed === false}
        recordId={recordIdRef.current}
        sessionId={sessionIdRef.current}
        imageKeys={concludeDraft?.result.events ? undefined : sessionImageKeys}
        onClose={() => {
          setConcludeDraft(null);
        }}
        onSaved={async (edited, savedRecordId) => {
          recordIdRef.current = savedRecordId;
          setConcludeSaved(true);
          // Keep the accumulated conclusion = the edited one, so later
          // replies merge ON TOP of the user's changes.
          setConcludeResult({ result: edited, sourceText: concludeDraft?.sourceText ?? "" });
          // NOTE: do NOT close the modal here — auto-save fires on 退出编辑
          // and the modal must stay open (only onClose/backdrop/Escape close).
          // Link the saved record to this session so a refresh restores the
          // conclusion (button glows → opens the stored report, no re-call).
          const sessionId = sessionIdRef.current;
          if (!sessionId) return;
          const payload = {
            title: edited.title,
            summary: edited.summary,
            items: edited.items,
            meals: edited.meals,
            sourceText: concludeDraft?.sourceText ?? "",
            imageKeys: edited.imageKeys ?? undefined,
            events: edited.events,
          };
          if (isAuthed) {
            const saveSession = async (body: object) => {
              const response = await fetch(`/api/sessions/${sessionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (!response.ok) {
                throw new Error(t["summary.saveFailed"]);
              }
            };
            await saveSession({
              conclusion: payload,
            });
            if (savedRecordId) {
              await saveSession({ recordId: savedRecordId });
            }
          } else {
            if (!setGuestConclusion(sessionId, payload, savedRecordId)) {
              throw new Error(t["summary.saveFailed"]);
            }
          }
        }}
      />
    </div>
  );
}
