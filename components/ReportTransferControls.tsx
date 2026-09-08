"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { addGuestRecord } from "@/lib/guestStore";
import type { ConcludeItem, ConcludeMeal, SavedRecord } from "@/lib/types";

interface ReportTransferControlsProps {
  records: SavedRecord[];
  guest: boolean | null;
  onImported: () => void | Promise<void>;
  labels: {
    export: string;
    import: string;
    importing: string;
    imported: (count: number) => string;
    error: string;
  };
}

type ImportableRecord = {
  title: string;
  summary: string;
  items: ConcludeItem[];
  meals?: ConcludeMeal[];
  sourceText?: string;
  sessionId?: string;
  recordedAt?: string;
};

function parseImportRecord(value: unknown): ImportableRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) return null;
  const items = candidate.items.filter(
    (item): item is ConcludeItem =>
      !!item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).name === "string"
  );
  if (items.length === 0) return null;
  const meals = Array.isArray(candidate.meals)
    ? candidate.meals.filter(
        (meal): meal is ConcludeMeal =>
          !!meal &&
          typeof meal === "object" &&
          typeof (meal as Record<string, unknown>).name === "string"
      )
    : undefined;
  return {
    title:
      typeof candidate.title === "string" && candidate.title.trim()
        ? candidate.title.trim()
        : "Imported report",
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    items,
    meals,
    sourceText:
      typeof candidate.sourceText === "string" ? candidate.sourceText : undefined,
    sessionId:
      typeof candidate.sessionId === "string" ? candidate.sessionId : undefined,
    recordedAt:
      typeof candidate.recordedAt === "string" ? candidate.recordedAt : undefined,
  };
}

export default function ReportTransferControls({
  records,
  guest,
  onImported,
  labels,
}: ReportTransferControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const exportReport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inschat-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importReport = async (file: File) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      let values: unknown[] = [];
      if (Array.isArray(parsed)) {
        values = parsed;
      } else if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as Record<string, unknown>).records)
      ) {
        values = (parsed as Record<string, unknown>).records as unknown[];
      }
      const imported = values
        .map(parseImportRecord)
        .filter((record): record is ImportableRecord => record !== null);
      if (imported.length === 0) throw new Error(labels.error);

      if (guest) {
        imported.forEach((record) => addGuestRecord(record));
      } else {
        for (const record of imported) {
          const response = await fetch("/api/records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
          });
          if (!response.ok) throw new Error(labels.error);
        }
      }
      await onImported();
      setMessage(labels.imported(imported.length));
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="report-transfer-controls">
      <button
        type="button"
        className="report-transfer-export"
        onClick={exportReport}
        disabled={busy || records.length === 0}
        title={labels.export}
        aria-label={labels.export}
      >
        <Download size={16} strokeWidth={2.25} aria-hidden="true" />
        {labels.export}
      </button>
      <button
        type="button"
        className="report-transfer-import"
        onClick={() => inputRef.current?.click()}
        disabled={busy || guest === null}
        title={busy ? labels.importing : labels.import}
        aria-label={busy ? labels.importing : labels.import}
      >
        <Upload size={16} strokeWidth={2.25} aria-hidden="true" />
        {busy ? labels.importing : labels.import}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importReport(file);
        }}
      />
      {(message || error) && (
        <span className={error ? "report-transfer-error" : "report-transfer-message"} aria-live="polite">
          {error || message}
        </span>
      )}
    </div>
  );
}
