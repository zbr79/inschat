"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Plus, Sparkles, Square, X } from "lucide-react";
import type { ChatImage } from "@/lib/types";
import { MAX_IMAGES } from "@/lib/types";
import { STR, useUiLang } from "@/lib/i18n";
import { useCompressImages, useReasoningEffort } from "@/lib/prefs";
import { compressImage } from "@/lib/imageCompress";
import { formatVoiceElapsed, useVoiceInput } from "@/lib/useVoiceInput";
import ImageViewer from "./ImageViewer";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface ComposerProps {
  sending: boolean;
  onSend: (text: string, images?: ChatImage[]) => void;
  onStop: () => void;
  disabled?: boolean;
  signedIn?: boolean;
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
}: ComposerProps) {
  const lang = useUiLang();
  const t = STR[lang];
  const [compressOn] = useCompressImages();
  const [reasoning, setReasoning] = useReasoningEffort();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ChatImage[]>([]);
  const [viewer, setViewer] = useState<ChatImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    const input = textInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [text]);

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
    setImageError(null);
  };

  const onTranscript = useCallback(
    (transcript: string, autoSend: boolean) => {
      const merged = insertAtCaret(transcript);
      if (!autoSend) return;
      const imgs = imagesRef.current;
      const trimmed = merged.trim();
      if (trimmed || imgs.length > 0) {
        onSend(trimmed, imgs.length > 0 ? imgs : undefined);
        clearComposer();
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

  const canSend = (text.trim().length > 0 || images.length > 0) && !sending && !disabled;
  const voiceBusy = voiceStatus !== "idle" && !sending && !disabled;
  const shouldShowSendBusy = voiceStatus === "transcribing" && !sending && !disabled;
  const hint = voiceHint || imageError;
  const micLabel =
    voiceStatus === "recording"
      ? t["composer.stopRecording"]
      : voiceStatus === "transcribing"
        ? t["composer.transcribing"]
        : t["composer.record"];

  const handleSend = () => {
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
    onSend(text.trim(), images.length > 0 ? images : undefined);
    clearComposer();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    const selected = files.slice(0, room);
    if (files.length > room) {
      setImageError(t["composer.maxImages"].replace("{count}", String(MAX_IMAGES)));
    }
    try {
      const loaded: ChatImage[] = [];
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
      }
      if (compressOn) {
        for (let i = 0; i < loaded.length; i++) {
          try {
            loaded[i] = await compressImage(loaded[i]);
          } catch {}
        }
      }
      setImages((prev) => [...prev, ...loaded].slice(0, MAX_IMAGES));
      if (loaded.length > 0) setImageError(null);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : t["composer.readError"]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="composer">
      {images.length > 0 && (
        <div className="preview-grid">
          {images.map((image, index) => (
            <div key={index} className="preview">
              <img
                src={`data:${image.mimeType};base64,${image.data}`}
                alt={t["composer.previewAlt"]}
                onClick={() => setViewer(image)}
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label={t["composer.removeImage"]}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="input-row">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={handleFiles}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => fileRef.current?.click()}
          aria-label={t["composer.attachImage"]}
          title={t["composer.attachImage"]}
          disabled={images.length >= MAX_IMAGES || disabled}
        >
          <Plus size={18} />
        </button>
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
        <button
          type="button"
          className={`composer-reasoning${reasoning === "max" ? " active" : ""}`}
          onClick={() => setReasoning(reasoning === "max" ? "medium" : "max")}
          aria-label={t["composer.reasoning"]}
          aria-pressed={reasoning === "max"}
          title={t["composer.reasoning"]}
          disabled={disabled}
        >
          <Sparkles size={14} />
          <span>{t["composer.reasoning.max"]}</span>
        </button>
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
          title={micLabel}
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
            title={voiceStatus === "recording" ? t["composer.finishAndSend"] : undefined}
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
