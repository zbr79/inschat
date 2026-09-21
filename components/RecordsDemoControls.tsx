"use client";

import { Trash2 } from "lucide-react";

interface RecordsDemoControlsProps {
  hasDemoData: boolean;
  busy: boolean;
  onRemove: () => void;
  labels: {
    remove: string;
    loading: string;
  };
}

export default function RecordsDemoControls({
  hasDemoData,
  busy,
  onRemove,
  labels,
}: RecordsDemoControlsProps) {
  const removeLabel = busy ? labels.loading : labels.remove;

  return (
    <div className="report-transfer-controls records-demo-actions">
      <button
        type="button"
        className="records-demo-remove"
        onClick={onRemove}
        disabled={busy || !hasDemoData}
        aria-label={removeLabel}
      >
        <Trash2 size={16} strokeWidth={2.25} aria-hidden="true" />
        <span className="report-transfer-label">{removeLabel}</span>
      </button>
    </div>
  );
}
