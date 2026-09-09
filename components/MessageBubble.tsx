"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Pencil, RefreshCw, X } from "lucide-react";
import "highlight.js/styles/github.css";
import ImageViewer from "./ImageViewer";
import type { ChatImage, ConcludeResult } from "@/lib/types";
import { formatElapsed } from "@/lib/format";
import { STR, useUiLang } from "@/lib/i18n";
import { modelLabel } from "@/lib/modelLabels";

interface Message {
  id: number;
  role: "user" | "model";
  text: string;
  images?: ChatImage[];
  streaming?: boolean;
  failed?: boolean;
  model?: string;
  hideModelMeta?: boolean;
  trying?: string;
  elapsed?: number;
}

function dataUrl(image: { mimeType: string; data: string }): string {
  return `data:${image.mimeType};base64,${image.data}`;
}

// Markdown collapses single newlines into spaces; convert them to hard
// breaks so the model's line-by-line format renders as separate lines.
function preserveLineBreaks(text: string): string {
  const lines = text.split("\n");
  return lines
    .map((line, index) => {
      if (index === lines.length - 1 || line.endsWith("  ")) return line;
      return `${line}  `;
    })
    .join("\n");
}

export default function MessageBubble({
  messages,
  guest = false,
  onRevert,
  onEdit,
  onRegenerate,
  onShare,
  canAct = true,
  flashId = null,
  editingId = null,
  editingText = "",
  editingImages = [],
  onEditingText,
  onEditingImages,
  onEditSave,
  onEditCancel,
}: {
  messages: Message[];
  guest?: boolean;
  onRevert?: (id: number) => void;
  onEdit?: (id: number) => void;
  onRegenerate?: (id: number) => void;
  onShare?: (id: number) => void;
  canAct?: boolean;
  flashId?: number | null;
  editingId?: number | null;
  editingText?: string;
  editingImages?: ChatImage[];
  onEditingText?: (text: string) => void;
  onEditingImages?: (images: ChatImage[]) => void;
  onEditSave?: (id: number) => void;
  onEditCancel?: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const lang = useUiLang();
  const t = STR[lang];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const input = editInputRef.current;
    if (!input || editingId === null) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
  }, [editingId]);

  useEffect(() => {
    const input = editInputRef.current;
    if (!input || editingId === null) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
  }, [editingId, editingText]);

  const copy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {}
  };

  const renderButtons = (isModel: boolean, message: Message) => (
    <>
      <button
        type="button"
        className={`action-button${copiedId === message.id ? " copied" : ""}`}
        title={copiedId === message.id ? t["actions.copied"] : t["actions.copy"]}
        aria-label={t["actions.copy"]}
        onClick={() => copy(message)}
      >
        {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
      </button>
      {!isModel && onEdit && (
        <button
          type="button"
          className="action-button"
          title={t["actions.edit"]}
          aria-label={t["actions.edit"]}
          onClick={() => onEdit(message.id)}
        >
          <Pencil size={13} />
        </button>
      )}
      {isModel && !message.failed && onRegenerate && (
        <button
          type="button"
          className="action-button"
          title={t["actions.regenerate"]}
          aria-label={t["actions.regenerate"]}
          onClick={() => onRegenerate(message.id)}
        >
          <RefreshCw size={13} />
        </button>
      )}
    </>
  );

  if (messages.length === 0) {
    return <main className="messages" />;
  }

  return (
    <main className="messages">
      {messages.map((message, index) => {
        const imageUrls = (message.images ?? []).map((image) => dataUrl(image));
        const splitImages =
          message.role === "user" && imageUrls.length > 0 && message.text
            ? imageUrls
            : null;
        const isEditing = editingId === message.id;
        const editImages = editingImages ?? message.images ?? [];
        return (
        <div
          key={message.id}
          id={`msg-${message.id}`}
          className={`message ${message.role}${flashId === message.id ? " flash" : ""}`}
        >
          <div className="message-body">
            {isEditing ? (
              <div className="bubble edit-bubble">
                {editImages.length > 0 && (
                  <div className="edit-images">
                    {editImages.map((image, imageIndex) => {
                      const url = dataUrl(image);
                      return (
                        <div key={imageIndex} className="edit-image">
                          <img
                            src={url}
                            alt={t["composer.uploadedAlt"]}
                            onClick={() => setViewer(url)}
                          />
                          <button
                            type="button"
                            className="image-remove"
                            onClick={() =>
                              onEditingImages?.(
                                editImages.filter((_, index) => index !== imageIndex)
                              )
                            }
                            aria-label={t["composer.removeImage"]}
                          >
                            <X size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <textarea
                  ref={editInputRef}
                  className="edit-input"
                  value={editingText}
                  onChange={(event) => onEditingText?.(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onEditCancel?.();
                    } else if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      event.preventDefault();
                      onEditSave?.(message.id);
                    }
                  }}
                  aria-label={t["actions.edit"]}
                />
                <div className="edit-actions">
                  <button
                    type="button"
                    className="edit-cancel"
                    onClick={() => onEditCancel?.()}
                  >
                    {t["actions.cancel"]}
                  </button>
                  <button
                    type="button"
                    className="edit-save"
                    onClick={() => onEditSave?.(message.id)}
                    disabled={!editingText.trim()}
                  >
                    {t["actions.save"]}
                  </button>
                </div>
              </div>
            ) : splitImages ? (
              <>
                {splitImages.map((url, imageIndex) => (
                  <div key={imageIndex} className="bubble image-only">
                    <img
                      src={url}
                       alt={t["composer.uploadedAlt"]}
                      onClick={() => setViewer(url)}
                    />
                  </div>
                ))}
                <div className="bubble">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {preserveLineBreaks(message.text)}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="bubble">
                {imageUrls.map((url, imageIndex) => (
                  <img
                    key={imageIndex}
                    src={url}
                     alt={t["composer.uploadedAlt"]}
                    onClick={() => setViewer(url)}
                  />
                ))}
                {message.text && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {preserveLineBreaks(message.text)}
                  </ReactMarkdown>
                )}
                {message.streaming && !message.text && (
                  <span className="thinking">
                    {!message.trying && message.model && (
                      <span className="thinking-label">{t["thinking"]}</span>
                    )}
                    <span className="thinking-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                )}
              </div>
            )}
            {message.role === "model" ? (
              <div className="reply-footer">
                {canAct && !isEditing && !message.streaming && (
                  <div className="action-bar model-bar">
                    {renderButtons(true, message)}
                  </div>
                )}
                {!message.failed && message.model && !message.hideModelMeta && (
                  <div className={`model-meta${message.streaming ? " live" : ""}`}>
                    {!message.streaming && message.elapsed !== undefined && (
                      <span>{formatElapsed(message.elapsed)}s · </span>
                    )}
                    <span>{modelLabel(message.model)}</span>
                  </div>
                )}
              </div>
            ) : (
              canAct && !isEditing && !message.streaming && (
                <div className="action-bar">{renderButtons(false, message)}</div>
              )
            )}
          </div>
        </div>
        );
      })}
      <div ref={endRef} />
      {viewer && (
         <ImageViewer src={viewer} alt={t["composer.uploadedAlt"]} onClose={() => setViewer(null)} />
      )}
    </main>
  );
}
