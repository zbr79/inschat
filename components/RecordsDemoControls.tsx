"use client";

import { ClipboardList, Trash2 } from "lucide-react";

interface RecordsDemoControlsProps {
  hasDemoData: boolean;
  busy: boolean;
  onLoad: () => void;
  onRemove: () => void;
  labels: {
    load: string;
    remove: string;
    loading: string;
  };
}

export default function RecordsDemoControls({
  hasDemoData,
  busy,
  onLoad,
  onRemove,
  labels,
}: RecordsDemoControlsProps) {
  const loadLabel = busy ? labels.loading : labels.load;
  const removeLabel = busy ? labels.loading : labels.remove;

  return (
    <div className="report-transfer-controls records-demo-actions">
      <button
        type="button"
        className="records-demo-load"
        onClick={onLoad}
        disabled={busy || hasDemoData}
        title={loadLabel}
        aria-label={loadLabel}
      >
        <ClipboardList size={16} strokeWidth={2.25} aria-hidden="true" />
        <span className="report-transfer-label">{loadLabel}</span>
      </button>
      <button
        type="button"
        className="records-demo-remove"
        onClick={onRemove}
        disabled={busy || !hasDemoData}
        title={removeLabel}
        aria-label={removeLabel}
      >
        <Trash2 size={16} strokeWidth={2.25} aria-hidden="true" />
        <span className="report-transfer-label">{removeLabel}</span>
      </button>
    </div>
  );
}
