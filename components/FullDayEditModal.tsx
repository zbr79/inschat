"use client";

import { X } from "lucide-react";
import type { SavedRecord } from "@/lib/types";

interface FullDayEditModalProps {
  dayLabel: string;
  records: SavedRecord[];
  labels: {
    title: string;
    close: string;
    entry: string;
    edit: string;
  };
  onClose: () => void;
  onEdit: (record: SavedRecord) => void;
}

export default function FullDayEditModal({
  dayLabel,
  records,
  labels,
  onClose,
  onEdit,
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
            <h3 id="full-day-edit-title">{labels.title}</h3>
            <time>{dayLabel}</time>
          </div>
          <button type="button" onClick={onClose} aria-label={labels.close}>
            <X size={17} />
          </button>
        </div>
        <div className="full-day-edit-list">
          {records.map((record, index) => (
            <div className="full-day-edit-row" key={record._id}>
              <span>
                {labels.entry} {index + 1}
              </span>
              <button type="button" onClick={() => onEdit(record)}>
                {labels.edit}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
