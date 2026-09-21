"use client";

import {
  AlertCircle,
  File,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType,
  LoaderCircle,
  Paperclip,
  X,
  type LucideIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useRef, useState, type ReactNode } from "react";
import { STR, useUiLang } from "@/lib/i18n";
import { MAX_DOCUMENTS } from "@/lib/documents/limits";
import type { DocumentAttachment } from "@/lib/documents/types";
import { uploadDocuments } from "@/lib/documentUpload";
import { MAX_ATTACHMENTS } from "@/lib/types";
import { toastError } from "@/lib/toast";
import { attachmentNameKey } from "@/lib/attachmentNames";

interface DocumentPickerProps {
  documents: DocumentAttachment[];
  onChange: (documents: DocumentAttachment[]) => void;
  onBusyChange: (busy: boolean) => void;
  onImagesSelected?: (files: File[]) => void;
  imageCount?: number;
  imageNames?: string[];
  renderTrigger?: (open: () => void, disabled: boolean) => ReactNode;
  renderAttachmentLayer?: (content: ReactNode, visible: boolean) => ReactNode;
  attachmentLayerTarget?: HTMLElement | null;
  disabled?: boolean;
}

function documentPresentation(name: string, mimeType: string): {
  Icon: LucideIcon;
  type: string;
  color: string;
} {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "txt") return { Icon: FileCode2, type: "TXT", color: "txt" };
  if (extension === "pdf") return { Icon: FileText, type: "PDF", color: "pdf" };
  if (extension === "docx") return { Icon: FileType, type: "DOCX", color: "docx" };
  if (extension === "xlsx") {
    return { Icon: FileSpreadsheet, type: "XLSX", color: "xlsx" };
  }
  return {
    Icon: File,
    type: extension.toUpperCase() || mimeType.split("/").pop()?.toUpperCase() || "FILE",
    color: "generic",
  };
}

export default function DocumentPicker({
  documents,
  onChange,
  onBusyChange,
  onImagesSelected,
  imageCount = 0,
  imageNames = [],
  renderTrigger,
  renderAttachmentLayer,
  attachmentLayerTarget,
  disabled = false,
}: DocumentPickerProps) {
  const lang = useUiLang();
  const t = STR[lang];
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"uploading" | "processing" | null>(null);
  const [uploadNames, setUploadNames] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const triggerDisabled = disabled || busy;

  const showLimitToast = () => {
    toastError(
      t["composer.maxAttachmentsReached"].replace("{count}", String(MAX_ATTACHMENTS))
    );
  };

  const openPicker = () => {
    if (imageCount + documents.length >= MAX_ATTACHMENTS) {
      showLimitToast();
      return;
    }
    fileRef.current?.click();
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const seenNames = new Set([
      ...imageNames.map(attachmentNameKey),
      ...documents.map((document) => attachmentNameKey(document.name)),
    ]);
    let hasDuplicate = false;
    const uniqueFiles = files.filter((file) => {
      const key = attachmentNameKey(file.name);
      if (seenNames.has(key)) {
        hasDuplicate = true;
        return false;
      }
      seenNames.add(key);
      return true;
    });
    if (hasDuplicate) toastError(t["composer.duplicateAttachment"]);
    if (uniqueFiles.length === 0) return;
    const imageFiles = uniqueFiles.filter(
      (file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name)
    );
    const documentFiles = uniqueFiles.filter((file) => !imageFiles.includes(file));
    const totalRoom = Math.max(0, MAX_ATTACHMENTS - imageCount - documents.length);
    const selectedImages = onImagesSelected ? imageFiles.slice(0, totalRoom) : [];
    const documentRoom = Math.max(
      0,
      Math.min(MAX_DOCUMENTS - documents.length, totalRoom - selectedImages.length)
    );
    const selected = documentFiles.slice(0, documentRoom);
    const limitMessage =
      imageFiles.length + documentFiles.length > totalRoom
        ? t["composer.maxAttachments"].replace("{count}", String(MAX_ATTACHMENTS))
        : documentFiles.length > documentRoom
          ? t["composer.maxDocuments"].replace("{count}", String(MAX_DOCUMENTS))
          : null;
    if (selectedImages.length > 0) onImagesSelected?.(selectedImages);
    if (selected.length === 0) {
      if (limitMessage && documentFiles.length > 0) setErrors([limitMessage]);
      return;
    }
    setBusy(true);
    onBusyChange(true);
    setProgress(0);
    setPhase("uploading");
    setUploadNames(selected.map((file) => file.name));
    setErrors(limitMessage ? [limitMessage] : []);
    try {
      const result = await uploadDocuments(
        selected,
        (value) => setProgress(value),
        () => setPhase("processing")
      );
      onChange(
        [...documents, ...result.documents].slice(
          0,
          Math.min(MAX_DOCUMENTS, MAX_ATTACHMENTS - imageCount)
        )
      );
      if (result.errors.length > 0) setErrors(result.errors);
    } catch (uploadError) {
      setErrors([
        uploadError instanceof Error ? uploadError.message : t["composer.documentError"],
      ]);
    } finally {
      setBusy(false);
      onBusyChange(false);
      setPhase(null);
      setUploadNames([]);
    }
  };

  const attachmentLayerVisible = documents.length > 0 || busy || errors.length > 0;
  const attachmentLayer = (
    <>
      {documents.length > 0 && (
        <div className="document-card-grid" aria-label={t["composer.documents"]}>
          {documents.map((document) => {
            const { Icon, type, color } = documentPresentation(
              document.name,
              document.mimeType
            );
            return (
              <div className="document-card" key={document.id}>
                <Icon
                  className={`document-file-icon document-file-icon-${color}`}
                  size={26}
                  aria-hidden="true"
                />
                <span className="document-card-copy">
                  <span className="document-card-name">
                    {document.name}
                  </span>
                  <span className="document-card-type">{type}</span>
                </span>
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => onChange(documents.filter((item) => item.id !== document.id))}
                  aria-label={`${t["composer.removeDocument"]}: ${document.name}`}
                  disabled={disabled || busy}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {busy && (
        <div className="document-upload-cards" aria-live="polite">
          {uploadNames.map((name, index) => {
            const { Icon, color } = documentPresentation(name, "");
            return (
              <div className="document-upload-card" key={`${name}-${index}`}>
                <LoaderCircle size={22} className="spin" aria-hidden="true" />
                <Icon
                  className={`document-file-icon document-file-icon-${color}`}
                  size={24}
                  aria-hidden="true"
                />
                <span className="document-card-copy">
                  <span className="document-card-name">
                    {name}
                  </span>
                  <span className="document-card-type">
                    {phase === "processing"
                      ? t["composer.processingDocument"]
                      : `${t["composer.uploadingFile"]} ${progress}%`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      {errors.length > 0 && (
        <div className="composer-attachment-errors" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <ul>
            {errors.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
  const renderedAttachmentLayer = renderAttachmentLayer?.(
    attachmentLayer,
    attachmentLayerVisible
  );
  const attachmentLayerOutput = attachmentLayerTarget
    ? renderedAttachmentLayer
      ? createPortal(renderedAttachmentLayer, attachmentLayerTarget)
      : null
    : renderedAttachmentLayer;

  return (
    <>
      {attachmentLayerOutput}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.pdf,.docx,.xlsx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        multiple
        hidden
        onChange={handleFiles}
      />
      {renderTrigger ? (
        renderTrigger(openPicker, triggerDisabled)
      ) : (
        <button
          type="button"
          className="icon-button"
          onClick={openPicker}
          aria-label={t["composer.attachDocument"]}
          disabled={triggerDisabled}
        >
          <Paperclip size={17} />
        </button>
      )}
    </>
  );
}
