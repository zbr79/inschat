"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Paperclip,
  X,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { STR, useUiLang } from "@/lib/i18n";
import { MAX_DOCUMENTS } from "@/lib/documents/limits";
import type { DocumentAttachment } from "@/lib/documents/types";
import { uploadDocuments } from "@/lib/documentUpload";

interface DocumentPickerProps {
  documents: DocumentAttachment[];
  onChange: (documents: DocumentAttachment[]) => void;
  onBusyChange: (busy: boolean) => void;
  renderTrigger?: (open: () => void, disabled: boolean) => ReactNode;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentPicker({
  documents,
  onChange,
  onBusyChange,
  renderTrigger,
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
  const triggerDisabled = disabled || busy || documents.length >= MAX_DOCUMENTS;

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const room = MAX_DOCUMENTS - documents.length;
    if (room <= 0) {
      setErrors([t["composer.maxDocuments"].replace("{count}", String(MAX_DOCUMENTS))]);
      return;
    }
    const selected = files.slice(0, room);
    setBusy(true);
    onBusyChange(true);
    setProgress(0);
    setPhase("uploading");
    setUploadNames(selected.map((file) => file.name));
    setErrors([]);
    try {
      const result = await uploadDocuments(
        selected,
        (value) => setProgress(value),
        () => setPhase("processing")
      );
      onChange([...documents, ...result.documents].slice(0, MAX_DOCUMENTS));
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

  return (
    <>
      {documents.length > 0 && !busy && (
        <div
          className={`document-chip-grid${errors.length > 0 ? " has-errors" : ""}`}
          aria-label={t["composer.documents"]}
        >
          {documents.map((document) => (
            <div className="document-chip" key={document.id}>
              <FileText size={15} aria-hidden="true" />
              <span className="document-chip-name" title={document.name}>
                {document.name}
              </span>
              <span className="document-chip-size">{formatSize(document.size)}</span>
              <span className="document-chip-status">
                <CheckCircle2 size={13} aria-hidden="true" />
                {t["composer.documentsReady"]}
              </span>
              <button
                type="button"
                onClick={() => onChange(documents.filter((item) => item.id !== document.id))}
                aria-label={`${t["composer.removeDocument"]}: ${document.name}`}
                disabled={disabled || busy}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {busy && (
        <div className="document-upload-panel" aria-live="polite">
          <div className="document-upload-header">
            <div className="document-upload-heading">
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
              <div>
                <strong>
                  {phase === "processing"
                    ? t["composer.processingDocuments"]
                    : t["composer.uploadingDocuments"].replace(
                        "{count}",
                        String(uploadNames.length)
                      )}
                </strong>
                <span>
                  {phase === "processing"
                    ? t["composer.processingDocument"]
                    : `${progress}%`}
                </span>
              </div>
            </div>
            <span className="document-upload-count">
              {uploadNames.length}/{MAX_DOCUMENTS}
            </span>
          </div>
          <div className="document-upload-track" aria-hidden="true">
            <span style={{ width: `${phase === "processing" ? 100 : progress}%` }} />
          </div>
          <div className="document-upload-files">
            {uploadNames.map((name, index) => (
              <span className="document-upload-file" key={`${name}-${index}`}>
                <FileText size={13} aria-hidden="true" />
                <span title={name}>{name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {errors.length > 0 && (
        <div className="document-errors" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <ul>
            {errors.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        multiple
        hidden
        onChange={handleFiles}
      />
      {renderTrigger ? (
        renderTrigger(() => fileRef.current?.click(), triggerDisabled)
      ) : (
        <button
          type="button"
          className="icon-button"
          onClick={() => fileRef.current?.click()}
          aria-label={t["composer.attachDocument"]}
          title={t["composer.attachDocument"]}
          disabled={triggerDisabled}
        >
          <Paperclip size={17} />
        </button>
      )}
    </>
  );
}
