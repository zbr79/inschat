// Sentinel markers embedded in the plain-text chat stream so the client
// can show which model is answering. They use U+2400 (SYMBOL FOR NULL)
// as a delimiter because real assistant text never contains it.
const MARK = "\u2400";
const MODEL_PREFIX = `${MARK}MODEL:`;
const TRYING_PREFIX = `${MARK}TRYING:`;
const LIMIT_PREFIX = `${MARK}LIMIT:`;
const FREE_PREFIX = `${MARK}FREE:`;
// No-op chunk pushed while tools/models run silently so proxies
// never see an idle connection and drop it. Stripped by the parser.
const KEEP_PREFIX = `${MARK}KEEP:`;
const QUESTION_PREFIX = `${MARK}QUESTION:`;
const QUESTION_CLEAR_PREFIX = `${MARK}QUESTION_CLEAR:`;

import type { PendingQuestion } from "./question";
import { sanitizeQuestionPayload } from "./question";

export function encodeModelMarker(model: string): string {
  return `${MODEL_PREFIX}${model}${MARK}`;
}

export function encodeTryingMarker(model: string): string {
  return `${TRYING_PREFIX}${model}${MARK}`;
}

export function encodeLimitMarker(resetAt: string): string {
  return `${LIMIT_PREFIX}${resetAt}${MARK}`;
}

// Emitted when a free model answered because the paid Go models failed
// (quota/balance exhausted) in the same request.
export function encodeFreeMarker(): string {
  return `${FREE_PREFIX}${MARK}`;
}

export function encodeKeepMarker(): string {
  return `${KEEP_PREFIX}${MARK}`;
}

export function encodeQuestionMarker(question: PendingQuestion): string {
  const safe = JSON.stringify(question).replaceAll(MARK, "");
  return `${QUESTION_PREFIX}${safe}${MARK}`;
}

export function encodeQuestionClearMarker(requestId: string): string {
  return `${QUESTION_CLEAR_PREFIX}${requestId.replaceAll(MARK, "")}${MARK}`;
}

interface Parsed {
  text: string;
  model?: string;
  trying?: string;
  limit?: string;
  free?: boolean;
  questions?: PendingQuestion;
  questionClear?: string;
}

function parseQuestionJson(raw: string): PendingQuestion | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const requestId = typeof parsed.requestId === "string" ? parsed.requestId : "";
    const sessionId = typeof parsed.sessionId === "string" ? parsed.sessionId : undefined;
    return sanitizeQuestionPayload(parsed, requestId, sessionId);
  } catch {
    return null;
  }
}

function markerValue(inner: string): {
  model?: string;
  trying?: string;
  limit?: string;
  free?: boolean;
  questions?: PendingQuestion;
  questionClear?: string;
} {
  if (inner.startsWith("MODEL:")) return { model: inner.slice(6) };
  if (inner.startsWith("TRYING:")) return { trying: inner.slice(7) };
  if (inner.startsWith("LIMIT:")) return { limit: inner.slice(6) };
  if (inner.startsWith("FREE:")) return { free: true };
  if (inner.startsWith("KEEP:")) return {};
  if (inner.startsWith("QUESTION_CLEAR:")) {
    const requestId = inner.slice("QUESTION_CLEAR:".length).trim();
    return requestId ? { questionClear: requestId } : {};
  }
  if (inner.startsWith("QUESTION:")) {
    const questions = parseQuestionJson(inner.slice("QUESTION:".length));
    return questions ? { questions } : {};
  }
  return {};
}

// Incremental parser that strips markers from arbitrarily split chunks.
export class ModelMarkerParser {
  private buffer = "";
  private inMarker = false;

  push(chunk: string): Parsed {
    this.buffer += chunk;
    let text = "";
    let model: string | undefined;
    let trying: string | undefined;
    let limit: string | undefined;
    let free: boolean | undefined;
    let questions: PendingQuestion | undefined;
    let questionClear: string | undefined;

    while (this.buffer) {
      if (this.inMarker) {
        const close = this.buffer.indexOf(MARK, 1);
        if (close === -1) return { text, model, trying, limit, free };
        const inner = this.buffer.slice(1, close);
        this.buffer = this.buffer.slice(close + 1);
        this.inMarker = false;
        const parsed = markerValue(inner);
        if (parsed.model) model = parsed.model;
        if (parsed.trying) trying = parsed.trying;
        if (parsed.limit !== undefined) limit = parsed.limit;
        if (parsed.free !== undefined) free = parsed.free;
        if (parsed.questions) questions = parsed.questions;
        if (parsed.questionClear) questionClear = parsed.questionClear;
        continue;
      }
      const start = this.buffer.indexOf(MARK);
      if (start === -1) {
        text += this.buffer;
        this.buffer = "";
        return { text, model, trying, limit, free, questions, questionClear };
      }
      text += this.buffer.slice(0, start);
      const tail = this.buffer.slice(start);
      if (
        tail.startsWith(MODEL_PREFIX) ||
        tail.startsWith(TRYING_PREFIX) ||
        tail.startsWith(LIMIT_PREFIX) ||
        tail.startsWith(FREE_PREFIX) ||
        tail.startsWith(KEEP_PREFIX) ||
        tail.startsWith(QUESTION_PREFIX) ||
        tail.startsWith(QUESTION_CLEAR_PREFIX)
      ) {
        const close = tail.indexOf(MARK, 1);
        if (close === -1) {
          this.buffer = tail;
          this.inMarker = true;
          return { text, model, trying, limit, free };
        }
        const inner = tail.slice(1, close);
        this.buffer = tail.slice(close + 1);
        const parsed = markerValue(inner);
        if (parsed.model) model = parsed.model;
        if (parsed.trying) trying = parsed.trying;
        if (parsed.limit !== undefined) limit = parsed.limit;
        if (parsed.free !== undefined) free = parsed.free;
        if (parsed.questions) questions = parsed.questions;
        if (parsed.questionClear) questionClear = parsed.questionClear;
        continue;
      }
      if (
        MODEL_PREFIX.startsWith(tail) ||
        TRYING_PREFIX.startsWith(tail) ||
        LIMIT_PREFIX.startsWith(tail) ||
        FREE_PREFIX.startsWith(tail) ||
        KEEP_PREFIX.startsWith(tail) ||
        QUESTION_PREFIX.startsWith(tail) ||
        QUESTION_CLEAR_PREFIX.startsWith(tail)
      ) {
        // Partial marker start split across chunks — wait for more.
        this.buffer = tail;
        this.inMarker = true;
        return { text, model, trying, limit, free, questions, questionClear };
      }
      // Unknown marker — drop the delimiter, keep the rest.
      this.buffer = tail.slice(1);
    }
    return { text, model, trying, limit, free, questions, questionClear };
  }

  flush(): string {
    const text = this.buffer;
    this.buffer = "";
    this.inMarker = false;
    return text;
  }
}
