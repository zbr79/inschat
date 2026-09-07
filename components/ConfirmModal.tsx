"use client";

import { X } from "lucide-react";

export default function ConfirmModal({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-modal-head">
          <h2 id="confirm-modal-title">{title}</h2>
          <button
            type="button"
            className="confirm-modal-close"
            onClick={onCancel}
            aria-label={cancelLabel}
          >
            <X size={16} />
          </button>
        </div>
        <p id="confirm-modal-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
