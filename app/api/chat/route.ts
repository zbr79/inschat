import {
  chatErrorMessage,
  imageExhaustedText,
  isBalanceError,
  quotaResetInfo,
  streamChat,
} from "@/lib/opencode";
import { ChatValidationError } from "@/lib/errors";
import { parseChatBody, type ChatRequest } from "@/lib/chatRequest";
import { encodeKeepMarker, ModelMarkerParser } from "@/lib/markers";
import { getUserFromRequest } from "@/lib/auth";
import {
  getSessionMessage,
  startPendingMessage,
  updatePendingMessage,
} from "@/lib/db";
import { getGuestRun, startGuestRun, updateGuestRun } from "@/lib/guestRunStore";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
// Resume polling reads this persisted copy; keep snapshots frequent enough
// that a refreshed browser still feels like an active stream.
const PROGRESS_INTERVAL_MS = 500;
const HEARTBEAT_INTERVAL_MS = 10_000;
const MAX_PROCESS_STEPS = 80;

function guestMessageFromRun(run: {
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
}) {
  return {
    _id: run.messageId,
    sessionId: run.sessionId,
    role: "model" as const,
    text: run.text,
    model: run.model,
    trying: run.trying,
    elapsed: run.elapsed,
    createdAt: new Date(run.startedAt).toISOString(),
    status: run.status,
    startedAt: new Date(run.startedAt).toISOString(),
    updatedAt: new Date(run.updatedAt).toISOString(),
    processSteps: run.processSteps,
  };
}

function trailKey(item: string): string {
  return item
    .replace(/\s*\(\+\d+\s+-\d+\)\s*$/, "")
    .replace(/\s*[\u2713\u2717]\s*$/, "")
    .trim()
    .toLowerCase();
}

const RUN_READ_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const messageId = url.searchParams.get("messageId");
  if (!sessionId || !messageId) {
    return Response.json(
      { error: '"sessionId" and "messageId" are required.' },
      { status: 400, headers: RUN_READ_HEADERS }
    );
  }
  try {
    const user = await getUserFromRequest(req);
    if (user) {
      const message = await getSessionMessage(user._id, sessionId, messageId);
      return message
        ? Response.json({ message }, { headers: RUN_READ_HEADERS })
        : Response.json(
            { error: "Message not found." },
            { status: 404, headers: RUN_READ_HEADERS }
          );
    }
    const run = await getGuestRun(sessionId, messageId);
    return run
      ? Response.json(
          { message: guestMessageFromRun(run) },
          { headers: RUN_READ_HEADERS }
        )
      : Response.json(
          { error: "Run not found." },
          { status: 404, headers: RUN_READ_HEADERS }
        );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load the run." },
      { status: 500, headers: RUN_READ_HEADERS }
    );
  }
}

export async function POST(req: Request) {
  let parsed: ChatRequest;
  try {
    parsed = parseChatBody(await req.json());
  } catch (error) {
    const message =
      error instanceof ChatValidationError
        ? error.message
        : "Invalid request body.";
    return Response.json({ error: message }, { status: 400 });
  }
  const {
    messages,
    timeZone,
    language,
    mode,
    reasoning,
    sessionId,
    pendingMessageId,
  } = parsed;
  const freeMode = mode === "free";
  // Only the latest message decides whether this send is an image request;
  // earlier photos in the history must not re-route text sends to the
  // paid-only vision chain.
  const lastMessage = messages[messages.length - 1];
  const hasImage = (lastMessage?.images?.length ?? 0) > 0;
  const user = await getUserFromRequest(req);
  let persistedMessageId: string | undefined;
  if (sessionId && user) {
    try {
      persistedMessageId = (
        await startPendingMessage(user._id, sessionId, {})
      )?._id;
    } catch (error) {
      console.warn("[chat] Could not create pending message:", error);
    }
  } else if (sessionId) {
    persistedMessageId = pendingMessageId ?? randomUUID();
    await startGuestRun(sessionId, persistedMessageId);
  }
  const persistedRun = Boolean(sessionId && persistedMessageId);
  const runMessageIdForHeader = persistedMessageId;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let detached = false;
      let visibleText = "";
      let model: string | undefined;
      let trying: string | undefined;
      const processSteps: string[] = [];
      let lastProgressAt = 0;
      let progressChain = Promise.resolve();
      const startedAt = Date.now();
      const parser = new ModelMarkerParser();

      const noteStep = (label: string) => {
        const clean = label.replace(/^\s*\u2192\s+/, "").trim().slice(0, 180);
        if (!clean) return;
        const key = trailKey(clean);
        if (processSteps.some((step) => trailKey(step) === key)) return;
        processSteps.push(clean);
        if (processSteps.length > MAX_PROCESS_STEPS) processSteps.shift();
      };

      const noteTextTrail = (chunk: string) => {
        for (const raw of chunk.split("\n")) {
          const match = raw.match(/^\s*\u2192\s+(.+)$/);
          if (match?.[1]) noteStep(match[1]);
        }
      };

      const persist = (status: "pending" | "complete" | "failed") => {
        if (!sessionId || !persistedMessageId) return Promise.resolve();
        const elapsed = (Date.now() - startedAt) / 1000;
        const payload = {
          text: visibleText,
          model,
          trying,
          elapsed,
          status,
          processSteps: processSteps.slice(),
        };
        if (user) {
          return updatePendingMessage(user._id, sessionId, persistedMessageId, payload).then(
            () => undefined
          );
        }
        return Promise.resolve(updateGuestRun(sessionId, persistedMessageId, payload)).then(
          () => undefined
        );
      };
      const queueProgress = (
        force = false,
        status: "pending" | "complete" | "failed" = "pending"
      ) => {
        const now = Date.now();
        if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) {
          return progressChain;
        }
        lastProgressAt = now;
        progressChain = progressChain.then(() => persist(status)).catch(() => {});
        return progressChain;
      };
      const send = (text: string) => {
        if (detached) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          detached = true;
          console.log("[chat] client disconnected; continuing detached run");
        }
      };
      req.signal.addEventListener("abort", () => {
        detached = true;
        console.log("[chat] client disconnected; continuing detached run");
      });
      const heartbeat = setInterval(() => {
        queueProgress(true);
        if (persistedRun) send(encodeKeepMarker());
      }, HEARTBEAT_INTERVAL_MS);

      try {
        for await (const text of streamChat(
          messages,
          timeZone,
          language,
          freeMode,
          reasoning,
          sessionId
        )) {
          const parsedChunk = parser.push(text);
          visibleText += parsedChunk.text;
          if (parsedChunk.model) model = parsedChunk.model;
          if (parsedChunk.trying) {
            trying = parsedChunk.trying;
            noteStep(parsedChunk.trying);
          }
          if (parsedChunk.text) {
            if (parsedChunk.text.includes("\u2192")) noteTextTrail(parsedChunk.text);
          }
          if (parsedChunk.text || parsedChunk.model || parsedChunk.trying) {
            queueProgress();
          }
          send(text);
        }
        visibleText += parser.flush();
        await queueProgress(true, "complete");
      } catch (error) {
        const message =
          error instanceof ChatValidationError
            ? error.message
            : await chatErrorMessage(error, language);
        if (!(error instanceof ChatValidationError) && isBalanceError(error) && hasImage) {
          // Vision model is paid-only: the reply itself says the image
          // quota is gone and when it resets (no red banner anymore).
          const { resetAt } = await quotaResetInfo();
          const errorText = imageExhaustedText(language, resetAt);
          visibleText += errorText;
          send(errorText);
        } else {
          const errorText = `\n\n[${message}]`;
          visibleText += errorText;
          send(errorText);
        }
        await queueProgress(true, "failed");
      } finally {
        clearInterval(heartbeat);
        await progressChain;
        if (!detached) {
          try {
            controller.close();
          } catch {}
        }
      }
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  };
  if (persistedRun) headers["X-Run-Persisted"] = "1";
  if (runMessageIdForHeader) headers["X-Run-Message-Id"] = runMessageIdForHeader;

  return new Response(stream, { headers });
}
