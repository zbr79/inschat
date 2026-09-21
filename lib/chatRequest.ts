import { ChatValidationError } from "./errors";
import { isValidTimeZone } from "./prompt";
import {
  MAX_DOCUMENTS,
  MAX_DOCUMENT_SOURCE_TEXT,
  MAX_DOCUMENT_SOURCES,
  MAX_DOCUMENT_TEXT,
  MAX_TOTAL_DOCUMENT_TEXT,
} from "./documents/limits";
import type { DocumentAttachment, DocumentSource } from "./documents/types";
import {
  MAX_ATTACHMENTS,
  MAX_IMAGES,
  MAX_MESSAGES,
  type ChatImage,
  type ChatMessage,
  type ChatMode,
} from "./types";

export interface ChatRequest {
  messages: ChatMessage[];
  timeZone?: string;
  language?: "zh" | "en";
  mode?: "preset" | "free";
  chatMode?: ChatMode;
  includeImages?: boolean;
  reasoning?: "max" | "medium" | "low";
  sessionId?: string;
  pendingMessageId?: string;
}

function parseImage(raw: unknown, index: number): ChatImage {
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as { mimeType?: unknown }).mimeType !== "string" ||
    typeof (raw as { data?: unknown }).data !== "string"
  ) {
    throw new ChatValidationError(`messages[${index}].images contains an invalid image.`);
  }
  return raw as ChatImage;
}

function parseDocumentSource(raw: unknown, index: number): DocumentSource {
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as { locator?: unknown }).locator !== "string" ||
    typeof (raw as { label?: unknown }).label !== "string" ||
    typeof (raw as { text?: unknown }).text !== "string"
  ) {
    throw new ChatValidationError(`messages[${index}].documents contains an invalid source.`);
  }
  const source = raw as DocumentSource;
  if (source.text.length > MAX_DOCUMENT_SOURCE_TEXT) {
    throw new ChatValidationError(`messages[${index}].documents contains an oversized source.`);
  }
  return source;
}

export function parseDocumentAttachment(raw: unknown, index = 0): DocumentAttachment {
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as { id?: unknown }).id !== "string" ||
    typeof (raw as { name?: unknown }).name !== "string" ||
    typeof (raw as { mimeType?: unknown }).mimeType !== "string" ||
    typeof (raw as { size?: unknown }).size !== "number" ||
    typeof (raw as { text?: unknown }).text !== "string" ||
    !Array.isArray((raw as { sources?: unknown }).sources)
  ) {
    throw new ChatValidationError(`messages[${index}].documents contains an invalid document.`);
  }
  const document = raw as DocumentAttachment;
  if (
    document.id.length > 128 ||
    document.name.length > 160 ||
    document.size < 0 ||
    document.text.length === 0 ||
    document.text.length > MAX_DOCUMENT_TEXT ||
    document.sources.length > MAX_DOCUMENT_SOURCES
  ) {
    throw new ChatValidationError(`messages[${index}].documents contains an invalid document.`);
  }
  return {
    ...document,
    sources: document.sources.map((source) => parseDocumentSource(source, index)),
  };
}

export function parseChatBody(body: unknown): ChatRequest {
  if (!body || typeof body !== "object") {
    throw new ChatValidationError("Request body must be a JSON object.");
  }
  const rawMessages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new ChatValidationError('"messages" must be a non-empty array.');
  }
  const messages = rawMessages
    .slice(-MAX_MESSAGES)
    .map((raw, index): ChatMessage => {
      if (!raw || typeof raw !== "object") {
        throw new ChatValidationError(`messages[${index}] is invalid.`);
      }
      const { role, text, images, documents } = raw as {
        role?: unknown;
        text?: unknown;
        images?: unknown;
        documents?: unknown;
      };
      if (role !== "user" && role !== "model") {
        throw new ChatValidationError(`messages[${index}].role must be "user" or "model".`);
      }
      if (typeof text !== "string") {
        throw new ChatValidationError(`messages[${index}].text must be a string.`);
      }
      let parsedImages: ChatImage[] | undefined;
      if (images !== undefined && images !== null) {
        if (!Array.isArray(images) || images.length > MAX_IMAGES) {
          throw new ChatValidationError(
            `messages[${index}].images must be an array of at most ${MAX_IMAGES} images.`
          );
        }
        parsedImages = images.map((image) => parseImage(image, index));
      }
      let parsedDocuments: DocumentAttachment[] | undefined;
      if (documents !== undefined && documents !== null) {
        if (!Array.isArray(documents) || documents.length > MAX_DOCUMENTS) {
          throw new ChatValidationError(
            `messages[${index}].documents must be an array of at most ${MAX_DOCUMENTS} documents.`
          );
        }
        parsedDocuments = documents.map((document) => parseDocumentAttachment(document, index));
        const totalText = parsedDocuments.reduce((sum, document) => sum + document.text.length, 0);
        if (totalText > MAX_TOTAL_DOCUMENT_TEXT) {
          throw new ChatValidationError(
            `messages[${index}].documents contain too much extracted text.`
          );
        }
      }
      if ((parsedImages?.length ?? 0) + (parsedDocuments?.length ?? 0) > MAX_ATTACHMENTS) {
        throw new ChatValidationError(
          `messages[${index}] may contain at most ${MAX_ATTACHMENTS} attachments.`
        );
      }
      return { role, text, images: parsedImages, documents: parsedDocuments };
    });

  const rawZone = (body as { timeZone?: unknown }).timeZone;
  let timeZone: string | undefined;
  if (rawZone !== undefined) {
    if (!isValidTimeZone(rawZone)) {
      throw new ChatValidationError('"timeZone" is invalid.');
    }
    timeZone = rawZone;
  }

  const rawLanguage = (body as { language?: unknown }).language;
  let language: "zh" | "en" | undefined;
  if (rawLanguage !== undefined) {
    if (rawLanguage !== "zh" && rawLanguage !== "en") {
      throw new ChatValidationError('"language" must be "zh" or "en".');
    }
    language = rawLanguage;
  }

  const rawMode = (body as { mode?: unknown }).mode;
  let mode: "preset" | "free" | undefined;
  if (rawMode !== undefined) {
    if (rawMode !== "preset" && rawMode !== "free") {
      throw new ChatValidationError('"mode" must be "preset" or "free".');
    }
    mode = rawMode;
  }

  const rawChatMode = (body as { chatMode?: unknown }).chatMode;
  let chatMode: ChatMode | undefined;
  if (rawChatMode !== undefined) {
    if (rawChatMode !== "health" && rawChatMode !== "general") {
      throw new ChatValidationError('"chatMode" must be "health" or "general".');
    }
    chatMode = rawChatMode;
  }

  const rawReasoning = (body as { reasoning?: unknown }).reasoning;
  let reasoning: "max" | "medium" | "low" | undefined;
  if (rawReasoning !== undefined) {
    if (rawReasoning !== "max" && rawReasoning !== "medium" && rawReasoning !== "low") {
      throw new ChatValidationError('"reasoning" must be "max", "medium" or "low".');
    }
    reasoning = rawReasoning;
  }

  const rawIncludeImages = (body as { includeImages?: unknown }).includeImages;
  let includeImages: boolean | undefined;
  if (rawIncludeImages !== undefined) {
    if (typeof rawIncludeImages !== "boolean") {
      throw new ChatValidationError('"includeImages" must be a boolean.');
    }
    includeImages = rawIncludeImages;
  }

  const rawSessionId = (body as { sessionId?: unknown }).sessionId;
  let sessionId: string | undefined;
  if (rawSessionId !== undefined) {
    if (
      typeof rawSessionId !== "string" ||
      rawSessionId.length === 0 ||
      rawSessionId.length > 128 ||
      /[\r\n]/.test(rawSessionId)
    ) {
      throw new ChatValidationError('"sessionId" is invalid.');
    }
    sessionId = rawSessionId;
  }

  const rawPendingMessageId = (body as { pendingMessageId?: unknown }).pendingMessageId;
  let pendingMessageId: string | undefined;
  if (rawPendingMessageId !== undefined) {
    if (
      typeof rawPendingMessageId !== "string" ||
      rawPendingMessageId.length === 0 ||
      rawPendingMessageId.length > 128 ||
      /[\r\n]/.test(rawPendingMessageId)
    ) {
      throw new ChatValidationError('"pendingMessageId" is invalid.');
    }
    pendingMessageId = rawPendingMessageId;
  }

  return {
    messages,
    timeZone,
    language,
    mode,
    chatMode,
    includeImages,
    reasoning,
    sessionId,
    pendingMessageId,
  };
}
