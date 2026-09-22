"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";
import type { DocumentAttachment } from "@/lib/documents/types";
import type { ChatImage, ChatMode } from "@/lib/types";
import { MAX_ATTACHMENTS } from "@/lib/types";
import { STR, useUiLang } from "@/lib/i18n";
import { useCompressImages } from "@/lib/prefs";
import { compressImage } from "@/lib/imageCompress";
import { formatVoiceElapsed, useVoiceInput } from "@/lib/useVoiceInput";
import { attachmentNameKey } from "@/lib/attachmentNames";
import ComposerAttachmentLayer from "./ComposerAttachmentLayer";
import DocumentPicker from "./DocumentPicker";
import ImageViewer from "./ImageViewer";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type SendResult = boolean | void | Promise<boolean | void>;

interface ComposerProps {
  sending: boolean;
  onSend: (
    text: string,
    images?: ChatImage[],
    documents?: DocumentAttachment[]
  ) => SendResult;
  onStop: () => void;
  disabled?: boolean;
  signedIn?: boolean;
  chatMode?: ChatMode;
  reportButton?: React.ReactNode;
}

function readImage(
  file: File,
  errors: { tooLarge: string; read: string }
): Promise<ChatImage> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error(errors.tooLarge));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [head, data] = dataUrl.split(",");
      const mimeType = head.match(/data:(.*?);/)?.[1] ?? file.type;
      resolve({ mimeType, data });
    };
    reader.onerror = () => reject(new Error(errors.read));
    reader.readAsDataURL(file);
  });
}

export default function Composer({
  sending,
  onSend,
  onStop,
  disabled = false,
  signedIn = false,
  chatMode = "general",
  reportButton,
}: ComposerProps) {
  const lang = useUiLang();
  const t = STR[lang];
  const [compressOn] = useCompressImages();
  const shouldCompressImages = !signedIn || compressOn;
  const [text, setText] = useState("");
  const [images, setImages] = useState<ChatImage[]>([]);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [viewer, setViewer] = useState<ChatImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [attachmentLayerTarget, setAttachmentLayerTarget] = useState<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const documentsRef = useRef(documents);
  documentsRef.current = documents;

  useEffect(() => {
    const input = textInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (!sending) return;
    setImages([]);
    setImageNames([]);
    setDocuments([]);
    setImageError(null);
  }, [sending]);

  const insertAtCaret = (snippet: string): string => {
    const cleaned = snippet.trim();
    if (!cleaned) return textRef.current;
    const el = textInputRef.current;
    const current = textRef.current;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const padBefore = before.length > 0 && !/\s$/.test(before) ? " " : "";
    const padAfter = after.length > 0 && !/^\s/.test(after) ? " " : "";
    const insert = `${padBefore}${cleaned}${padAfter}`;
    const next = `${before}${insert}${after}`;
    setText(next);
    const caret = before.length + insert.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
    return next;
  };

  const clearComposer = () => {
    setText("");
    setImages([]);
    setImageNames([]);
    setDocuments([]);
    setImageError(null);
  };

  const onTranscript = useCallback(
    (transcript: string, autoSend: boolean) => {
      const merged = insertAtCaret(transcript);
      if (!autoSend) return;
      const imgs = imagesRef.current;
      const docs = documentsRef.current;
      const trimmed = merged.trim();
      if (trimmed || imgs.length > 0 || docs.length > 0) {
        void Promise.resolve(
          onSend(trimmed, imgs.length > 0 ? imgs : undefined, docs.length > 0 ? docs : undefined)
        ).then((accepted) => {
          if (accepted !== false) clearComposer();
        });
      }
    },
    [onSend]
  );

  const {
    voiceHint,
    voiceStatus,
    elapsedMs,
    handleMic,
    requestAutoSend,
    stopAndTranscribe,
  } = useVoiceInput({
    disabled,
    signedIn,
    labels: {
      micUnsupported: t["composer.micUnsupported"],
      micDenied: t["composer.micDenied"],
      audioTooLarge: t["composer.audioTooLarge"],
      transcribeUnavailable: t["composer.transcribeUnavailable"],
    },
    onTranscript,
  });

  const canSend =
    (text.trim().length > 0 || images.length > 0 || documents.length > 0) &&
    !sending &&
    !disabled &&
    !documentBusy;
  const voiceBusy = voiceStatus !== "idle" && !sending && !disabled;
  const shouldShowSendBusy = voiceStatus === "transcribing" && !sending && !disabled;
  const hint = voiceHint;
  const micLabel =
    voiceStatus === "recording"
      ? t["composer.stopRecording"]
      : voiceStatus === "transcribing"
        ? t["composer.transcribing"]
        : t["composer.record"];

  const handleSend = async () => {
    if (disabled || sending) return;
    if (voiceStatus === "recording") {
      requestAutoSend();
      stopAndTranscribe();
      return;
    }
    if (voiceStatus === "transcribing") {
      requestAutoSend();
      return;
    }
    if (!canSend) return;
    const accepted = await onSend(
      text.trim(),
      images.length > 0 ? images : undefined,
      documents.length > 0 ? documents : undefined
    );
    if (accepted !== false) clearComposer();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const room = Math.max(0, MAX_ATTACHMENTS - images.length - documents.length);
    const selected = files.slice(0, room);
    if (files.length > room) {
      setImageError(
        t["composer.maxAttachments"].replace("{count}", String(MAX_ATTACHMENTS))
      );
    }
    try {
      const loaded: ChatImage[] = [];
      const loadedNames: string[] = [];
      for (const file of selected) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setImageError(t["composer.unsupportedImage"]);
          continue;
        }
        loaded.push(
          await readImage(file, {
            tooLarge: t["composer.imageTooLarge"],
            read: t["composer.readError"],
          })
        );
        loadedNames.push(file.name);
      }
      if (shouldCompressImages) {
        for (let i = 0; i < loaded.length; i++) {
          try {
            loaded[i] = await compressImage(loaded[i]);
          } catch {}
        }
      }
      setImages((prev) =>
        [...prev, ...loaded].slice(0, Math.max(0, MAX_ATTACHMENTS - documents.length))
      );
      setImageNames((prev) =>
        [...prev, ...loadedNames].slice(0, Math.max(0, MAX_ATTACHMENTS - documents.length))
      );
      if (loaded.length > 0) setImageError(null);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : t["composer.readError"]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageNames((prev) => prev.filter((_, imageIndex) => imageIndex !== index));
  };

  return (
    <div className="composer">
      {reportButton && <div className="composer-top-actions">{reportButton}</div>}
      <div className="composer-attachment-slot" ref={setAttachmentLayerTarget} />
      <div className={`input-row mode-${chatMode}`}>
        <DocumentPicker
          documents={documents}
          onChange={setDocuments}
          onBusyChange={setDocumentBusy}
          onImagesSelected={handleImageFiles}
          renderAttachmentLayer={(documentLayer, documentLayerVisible) => {
            return (
              <ComposerAttachmentLayer
                images={images}
                imageError={imageError}
                documentLayer={documentLayer}
                documentLayerVisible={documentLayerVisible}
                onImageClick={setViewer}
                onRemoveImage={removeImage}
                imageAlt={t["composer.previewAlt"]}
                removeImageLabel={t["composer.removeImage"]}
              />
            );
          }}
          imageCount={images.length}
          imageNames={imageNames.map(attachmentNameKey)}
          attachmentLayerTarget={attachmentLayerTarget}
          disabled={disabled}
          renderTrigger={(open, triggerDisabled) => (
            <button
              type="button"
              className="icon-button composer-attachment"
              onClick={open}
              aria-label={t["composer.attachFile"]}
              disabled={triggerDisabled}
            >
              <Paperclip size={18} />
            </button>
          )}
        />
        <textarea
          ref={textInputRef}
          rows={1}
          value={text}
          placeholder=""
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={t["composer.message"]}
        />
        {voiceStatus !== "idle" && (
          <span
            className={`composer-mic-timer${voiceStatus === "transcribing" ? " dim" : ""}`}
            aria-live="polite"
          >
            {formatVoiceElapsed(elapsedMs)}
          </span>
        )}
        <button
          type="button"
          className={`icon-button composer-mic${voiceStatus === "recording" ? " recording" : ""}${voiceStatus === "transcribing" ? " transcribing" : ""}`}
          onClick={handleMic}
          aria-label={micLabel}
          aria-pressed={voiceStatus === "recording"}
          aria-busy={voiceStatus === "transcribing"}
          disabled={disabled || voiceStatus === "transcribing"}
        >
          <Mic size={18} />
        </button>
        {sending ? (
          <button type="button" className="send-button" onClick={onStop} aria-label={t["composer.stop"]}>
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            className={`send-button${voiceStatus === "recording" ? " finish" : ""}`}
            onClick={handleSend}
            disabled={!canSend && !voiceBusy}
            aria-busy={shouldShowSendBusy}
            aria-label={voiceStatus === "recording" ? t["composer.finishAndSend"] : t["composer.send"]}
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      {hint && <p className="hint">{hint}</p>}
      {viewer && (
        <ImageViewer
          src={`data:${viewer.mimeType};base64,${viewer.data}`}
          alt={t["composer.previewAlt"]}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
