"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import AuthForm from "./AuthForm";

export default function AuthModal({
  open,
  onClose,
  onAuthed,
}: {
  open: boolean;
  onClose: () => void;
  onAuthed: () => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="auth-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="auth-modal" role="dialog" aria-modal="true">
        <div className="auth-card">
          <button
            type="button"
            className="auth-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            onSuccess={() => {
              onClose();
              onAuthed();
            }}
          />
        </div>
      </div>
    </>
  );
}