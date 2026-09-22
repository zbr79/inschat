"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, KeyRound, LogOut, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

interface AccountSettingsModalProps {
  t: Record<string, string>;
  username: string;
  displayName: string;
  onChangePassword: () => void;
  onSignOut: () => void;
  onClearAccountData: () => void;
  onClose: () => void;
}

export default function AccountSettingsModal({
  t,
  username,
  displayName,
  onChangePassword,
  onSignOut,
  onClearAccountData,
  onClose,
}: AccountSettingsModalProps) {
  const [draft, setDraft] = useState(displayName);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    if (!editing) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editing]);

  const beginEdit = () => {
    setError(null);
    setEditing(true);
  };

  const saveDisplayName = async () => {
    if (busy) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setError(t["settings.displayNameRequired"]);
      return;
    }
    if (trimmed.length > 64) {
      setError(t["settings.displayNameTooLong"]);
      return;
    }
    if (trimmed === displayName) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        errorCode?: string;
        user?: { displayName?: string };
      };
      if (!response.ok) {
        const message =
          body.errorCode === "displayNameRequired"
            ? t["settings.displayNameRequired"]
            : body.errorCode === "displayNameTooLong"
              ? t["settings.displayNameTooLong"]
              : t["settings.displayNameUpdateFailed"];
        throw new Error(message);
      }
      setDraft(body.user?.displayName ?? trimmed);
      setEditing(false);
      toast.success(t["settings.displayNameSaved"]);
      window.dispatchEvent(new CustomEvent("inschat-auth"));
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t["settings.displayNameUpdateFailed"];
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisplayNameKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      setDraft(displayName);
      setError(null);
      setEditing(false);
    }
  };

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="settings-modal" role="dialog" aria-modal="true">
        <div className="settings-head">
          <span className="settings-title">{t["settings.accountTitle"]}</span>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label={t["actions.cancel"]}
          >
            <X size={16} />
          </button>
        </div>
        <div className="account-settings-profile">
          <span className="account-settings-avatar">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="account-settings-copy">
            <div className="account-settings-display-row">
              {editing ? (
                <input
                  ref={inputRef}
                  className="account-settings-display-input"
                  value={draft}
                  maxLength={64}
                  disabled={busy}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => void saveDisplayName()}
                  onKeyDown={handleDisplayNameKeyDown}
                  aria-label={t["settings.displayName"]}
                />
              ) : (
                <button
                  type="button"
                  className="account-settings-display-button"
                  onClick={beginEdit}
                >
                  <span>{displayName}</span>
                  <Pencil size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            <span className="account-settings-handle">@{username}</span>
            {error && <p className="settings-inline-error">{error}</p>}
          </div>
        </div>
        <button
          type="button"
          className="settings-row settings-link"
          onClick={onChangePassword}
        >
          <span className="settings-row-icon">
            <KeyRound size={16} />
          </span>
          <span className="settings-label">{t["settings.changePassword"]}</span>
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="settings-row settings-link"
          onClick={onSignOut}
        >
          <span className="settings-row-icon">
            <LogOut size={16} />
          </span>
          <span className="settings-label">{t["nav.signOut"]}</span>
          <ChevronRight size={16} />
        </button>
        <div className="settings-row settings-danger">
          <span className="settings-row-icon settings-danger-icon">
            <Trash2 size={16} />
          </span>
          <span className="settings-label">{t["settings.clearAccountData"]}</span>
          <button
            type="button"
            className="settings-danger-button"
            onClick={onClearAccountData}
          >
            {t["settings.clearAccountData"]}
          </button>
        </div>
      </div>
    </>
  );
}
