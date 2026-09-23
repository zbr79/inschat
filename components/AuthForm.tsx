"use client";

import Link from "next/link";
import { useState } from "react";
import { STR } from "@/lib/i18n";
import { toastError } from "@/lib/toast";

interface AuthResponse {
  error?: string;
  errorCode?: string;
  min?: number;
  max?: number;
}

export default function AuthForm({
  mode,
  onModeChange,
  switchHref,
  onSuccess,
}: {
  mode: "login" | "register";
  onModeChange?: (mode: "login" | "register") => void;
  switchHref?: string;
  onSuccess: () => void;
}) {
  const t = STR.en;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, language: "en" }),
      });
      const body = (await response.json().catch(() => ({}))) as AuthResponse;
      if (!response.ok) {
        const message =
          body.errorCode === "invalidCredentials"
            ? t["auth.invalidCredentials"]
            : body.errorCode === "usernameTaken"
              ? t["auth.usernameTaken"]
              : body.errorCode === "usernameInvalid"
                ? t["auth.usernameInvalid"]
                : body.errorCode === "passwordLength"
                  ? t["auth.passwordLength"]
                      .replace("{min}", String(body.min ?? 8))
                      .replace("{max}", String(body.max ?? 128))
                  : body.errorCode === "usernameRequired"
                    ? t["auth.usernameRequired"]
                    : body.errorCode === "passwordRequired"
                      ? t["auth.passwordRequired"]
                      : body.errorCode === "invalidBody"
                        ? t["auth.invalidBody"]
                        : mode === "login"
                          ? t["auth.signInFailed"]
                          : t["auth.createFailed"];
        throw new Error(message);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t["auth.generic"]);
    } finally {
      setBusy(false);
    }
  };

  const switchLabel = mode === "login" ? t["auth.noAccount"] : t["auth.haveAccount"];
  const switchContent = mode === "login" ? (
    <button
      type="button"
      className="auth-toggle"
      onClick={() => toastError(t["auth.signupDisabled"])}
    >
      {switchLabel}
    </button>
  ) : switchHref ? (
    <Link className="auth-toggle" href={switchHref}>
      {switchLabel}
    </Link>
  ) : (
    <button
      type="button"
      className="auth-toggle"
      onClick={() => {
        onModeChange?.("login");
        setError(null);
      }}
    >
      {switchLabel}
    </button>
  );

  return (
    <>
      <div className="auth-card-head">
        <h2>{mode === "login" ? t["auth.signIn"] : t["auth.createAccount"]}</h2>
      </div>
      <form onSubmit={submit} className="auth-form">
        <input
          className="auth-input"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t["auth.username"]}
          autoComplete="username"
          aria-label={t["auth.username"]}
          required
        />
        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={mode === "register" ? t["auth.passwordHint"] : t["auth.password"]}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          aria-label={t["auth.password"]}
          required
        />
        {error && <p className="conclusion-error">{error}</p>}
        <button type="submit" className="auth-button" disabled={busy}>
          {busy
            ? t["auth.pleaseWait"]
            : mode === "login"
              ? t["auth.signIn"]
              : t["auth.createAccount"]}
        </button>
      </form>
      {switchContent}
    </>
  );
}
