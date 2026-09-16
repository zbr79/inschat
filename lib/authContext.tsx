"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AuthUser {
  _id: string;
  username: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  authChecked: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) {
        setUser(null);
      } else if (response.ok) {
        const body = (await response.json()) as { user?: AuthUser };
        setUser(body.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onAuth = () => void refresh();
    window.addEventListener("inschat-auth", onAuth);
    return () => window.removeEventListener("inschat-auth", onAuth);
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, authChecked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
