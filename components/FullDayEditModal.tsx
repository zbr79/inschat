"use client";

import { X } from "lucide-react";
import type { ConcludeResult, SavedRecord } from "@/lib/types";
import ConcludeModal from "./ConcludeModal";

interface FullDayEditModalProps {
  dayLabel: string;
  records: SavedRecord[];
  labels: {
    close: string;
  };
  onClose: () => void;
  guest: boolean;
  onSaved: (
    record: SavedRecord,
    edited: ConcludeResult,
    savedRecordId: string | null
  ) => void;
}

export default function FullDayEditModal({
  dayLabel,
  records,
  labels,
  onClose,
  guest,
  onSaved,
}: FullDayEditModalProps) {
  return (
    <>
      <div className="full-day-edit-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="full-day-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-day-edit-title"
      >
        <div className="full-day-edit-head">
          <div>
            <h3 id="full-day-edit-title">{dayLabel}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label={labels.close}>
            <X size={17} />
          </button>
        </div>
        <div className="full-day-edit-list">
          {records.map((record) => (
            <ConcludeModal
              key={record._id}
              open
              embedded
              result={{
                title: record.title,
                summary: record.summary,
                items: record.items,
                meals: record.meals,
              }}
              sourceText={record.sourceText ?? ""}
              guest={guest}
              recordId={record._id}
              sessionId={record.sessionId}
              onClose={onClose}
              onSaved={(edited, savedRecordId) =>
                onSaved(record, edited, savedRecordId)
              }
            />
          ))}
        </div>
      </div>
    </>
  );
}
