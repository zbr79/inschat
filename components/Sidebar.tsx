"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, X, SquarePen, Folder, Search, PanelLeft, Pin, PinOff, Settings, User, MoreHorizontal, Pencil, Trash2, ChevronRight, Languages, FileText, Gauge, LogOut, ImageDown, HeartPulse, KeyRound } from "lucide-react";
import type { ChatMode, ChatSession } from "@/lib/types";
import {
  deleteGuestSession,
  listGuestSessions,
  pinGuestSession,
  renameGuestSession,
  type GuestSession,
} from "@/lib/guestStore";
import { STR, useUiLang, setUiLang } from "@/lib/i18n";
import SearchModal from "./SearchModal";
import AuthModal from "./AuthModal";
import ConfirmModal from "./ConfirmModal";
import ChangePasswordModal from "./ChangePasswordModal";
import { useCompressImages, useHealthMode } from "@/lib/prefs";
import { SESSIONS_CHANGED_EVENT } from "@/lib/sessionTitle";
import { useAuth } from "@/lib/authContext";
import { resetGuestDataForFreshVisit } from "@/lib/visitorIntent";

interface SidebarSession {
  id: string;
  title: string;
  pinned?: boolean;
  chatMode: ChatMode;
}

const COLLAPSED_KEY = "inschat_sidebar_collapsed";

// DOM-measured truncation: render, then drop whole characters until the
// real element stops overflowing. Never cuts a letter in half.
function FitTitle({ title }: { title: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(title);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = title;
    let trimmed = title;
    while (el.scrollWidth > el.clientWidth && trimmed.length > 1) {
      trimmed = trimmed.slice(0, -1);
      el.textContent = trimmed;
    }
    setText(trimmed);
  }, [title]);
  return (
    <span ref={ref} className="session-title">
      {text}
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSession = searchParams.get("session");
  const lang = useUiLang();
  const t = STR[lang];
  const { user, authChecked } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[] | null>(null);
  const [guestSessions, setGuestSessions] = useState<GuestSession[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarScrolled, setSidebarScrolled] = useState(false);
  const [healthCollapsed, setHealthCollapsed] = useState(false);
  const [generalCollapsed, setGeneralCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [clearAccountDataOpen, setClearAccountDataOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [compressImages, setCompressImages] = useCompressImages();
  const [healthMode, setHealthMode] = useHealthMode();
  const [menuFor, setMenuFor] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, currentSession]);

  useEffect(() => {
    if (!menuOpen || !window.matchMedia("(max-width: 640px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Escape closes the mobile drawer (and any open row menu). Skip when a
  // dialog is open so Search / Settings / Auth handle Escape themselves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      setMenuOpen(false);
      setMenuFor(null);
      setRenamingId(null);
      setDeleteDataOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [settingsOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === "O" || event.key === "o")) {
        event.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    if (authChecked && pathname === "/usage" && !user) {
      router.replace("/");
    }
  }, [authChecked, pathname, router, user]);

  // Deep link /?auth=1 (redirect target of the old /login page) opens the
  // auth modal automatically.
  useEffect(() => {
    if (searchParams.get("auth") === "1") {
      setAuthOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("auth");
      router.replace(`/?${params.toString()}`);
    }
  }, [searchParams, router]);

  const load = useCallback(() => {
    if (!authChecked) return;
    if (user) {
      fetch("/api/sessions")
        .then((response) => response.json())
        .then((body: { sessions: ChatSession[] }) => setSessions(body.sessions))
        .catch(() => {});
    } else {
      setGuestSessions(listGuestSessions());
    }
  }, [authChecked, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onSessionsChanged = () => load();
    window.addEventListener(SESSIONS_CHANGED_EVENT, onSessionsChanged);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, onSessionsChanged);
  }, [load]);


  const remove = async (id: string) => {
    if (deleting) return;
    setDeleting(id);
    try {
      if (user) {
        const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("delete failed");
        setSessions((prev) => prev?.filter((session) => session._id !== id) ?? null);
      } else {
        deleteGuestSession(id);
        setGuestSessions(listGuestSessions());
      }
      if (currentSession === id) router.replace("/");
    } catch {} finally {
      setDeleting(null);
    }
  };

  const rename = async (id: string) => {
    const title = renameText.trim();
    setMenuFor(null);
    setRenamingId(null);
    if (!title) return;
    try {
      if (user) {
        const response = await fetch(`/api/sessions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!response.ok) throw new Error("rename failed");
        setSessions((prev) =>
          prev?.map((session) =>
            session._id === id ? { ...session, title } : session
          ) ?? null
        );
      } else {
        renameGuestSession(id, title);
        setGuestSessions(listGuestSessions());
      }
    } catch {}
  };

  const togglePin = async (id: string, pinned: boolean) => {
    try {
      if (user) {
        const response = await fetch(`/api/sessions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned: !pinned }),
        });
        if (!response.ok) throw new Error("pin failed");
        setSessions((prev) =>
          prev?.map((session) =>
            session._id === id ? { ...session, pinned: !pinned } : session
          ) ?? null
        );
      } else {
        pinGuestSession(id, !pinned);
        setGuestSessions(listGuestSessions());
      }
    } catch {}
  };


  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {} finally {
      window.dispatchEvent(new CustomEvent("inschat-auth"));
      router.replace("/");
    }
  };

  const clearAccountData = async () => {
    try {
      const response = await fetch("/api/sessions?all=1", { method: "DELETE" });
      if (!response.ok) throw new Error("clear account data failed");
      setSessions([]);
      window.dispatchEvent(new CustomEvent("inschat-records-changed"));
      setClearAccountDataOpen(false);
      setSettingsOpen(false);
      if (currentSession) router.replace("/");
    } catch {}
  };

  const ownerList = (sessions ?? []).sort(
    (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false)
  ).map((session) => ({
    id: session._id,
    title: session.title,
    pinned: session.pinned,
    chatMode: session.chatMode,
  }));
  const guestList = guestSessions.sort(
    (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false)
  ).map((session) => ({
    id: session.id,
    title: session.title,
    pinned: session.pinned,
    chatMode: session.chatMode,
  }));

  const startNewChat = (chatMode: ChatMode) => {
    setMenuOpen(false);
    router.push(`/?newMode=${chatMode}`);
  };

  const renderSessionRow = (
    id: string,
    title: string,
    pinned: boolean
  ) => (
    <div key={id} className={`session-row${pinned ? " pinned" : ""}`}>
      {renamingId === id ? (
        <input
          type="text"
          className="rename-input"
          value={renameText}
          autoFocus
          onFocus={(event) => {
            event.target.setSelectionRange(0, 0);
            event.target.scrollLeft = 0;
          }}
          onChange={(event) => setRenameText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") rename(id);
            if (event.key === "Escape") setRenamingId(null);
          }}
          onBlur={() => rename(id)}
          aria-label={t["nav.rename"]}
        />
      ) : (
        <Link
          href={`/?session=${id}`}
          prefetch={false}
          className={`session-link${id === currentSession ? " active" : ""}`}
          onClick={() => setMenuOpen(false)}
        >
          <FitTitle title={title} />
        </Link>
      )}
      <button
        type="button"
        className="session-more"
        aria-label={t["nav.more"]}
        onClick={(event) => {
          if (menuFor?.id === id) {
            setMenuFor(null);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const menuWidth = 150;
          const left =
            rect.right + 6 + menuWidth > window.innerWidth
              ? rect.left - menuWidth - 6
              : rect.right + 6;
          const top = Math.max(
            8,
            Math.min(rect.top, window.innerHeight - 130)
          );
          setMenuFor({ id, top, left });
          setRenamingId(null);
        }}
      >
        <MoreHorizontal size={15} />
      </button>
      {menuFor?.id === id && (
        <>
          <div
            className="row-menu-backdrop"
            onClick={() => setMenuFor(null)}
            aria-hidden="true"
          />
          <div
            className="row-menu"
            style={{ top: menuFor.top, left: menuFor.left }}
          >
            <button
              type="button"
              className="row-menu-item"
              onClick={() => {
                setRenamingId(id);
                setRenameText(title);
                setMenuFor(null);
              }}
            >
              <Pencil size={14} />
              {t["nav.rename"]}
            </button>
            <button
              type="button"
              className="row-menu-item"
              onClick={() => {
                setMenuFor(null);
                togglePin(id, pinned);
              }}
            >
              {pinned ? <PinOff size={14} /> : <Pin size={14} />}
              {pinned ? t["nav.unpin"] : t["nav.pin"]}
            </button>
            <button
              type="button"
              className="row-menu-item danger"
              disabled={deleting !== null}
              onClick={() => {
                setMenuFor(null);
                remove(id);
              }}
            >
              <Trash2 size={14} />
              {t["nav.delete"]}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderSessionSection = (
    chatMode: ChatMode,
    title: string,
    sessionsForMode: SidebarSession[],
    collapsedSection: boolean,
    setCollapsedSection: (collapsed: boolean) => void
  ) => {
    return (
      <section className={`session-section ${chatMode}`}>
        <div className="session-section-head">
          <button
            type="button"
            className="catalog-toggle"
            onClick={() => setCollapsedSection(!collapsedSection)}
            aria-expanded={!collapsedSection}
          >
            <Folder size={15} className="session-folder-icon" aria-hidden="true" />
            <span className="sidebar-label sidebar-catalog-label">{title}</span>
          </button>
          <button
            type="button"
            className="section-new-chat"
            onClick={() => startNewChat(chatMode)}
            aria-label={chatMode === "health" ? t["nav.newHealthChat"] : t["nav.newGeneralChat"]}
          >
            <SquarePen size={14} aria-hidden="true" />
          </button>
        </div>
        {!collapsedSection && (
          <>
            {chatMode === "health" && (
              <Link
                href="/records"
                prefetch={false}
                className={`sidebar-records-button health-records-button${pathname.startsWith("/records") ? " active" : ""}`}
                onClick={() => setMenuOpen(false)}
                aria-current={pathname.startsWith("/records") ? "page" : undefined}
              >
                <FileText size={15} aria-hidden="true" />
                <span className="sidebar-label sidebar-catalog-label">{t["nav.records"]}</span>
              </Link>
            )}
            {sessionsForMode.length > 0 && (
              <div className="session-list">
                {sessionsForMode.map((session) =>
                  renderSessionRow(session.id, session.title, Boolean(session.pinned))
                )}
              </div>
            )}
          </>
        )}
      </section>
    );
  };

  return (
    <>
      <div className="mobile-bar">
        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label={t["nav.openMenu"]}
        >
          <Menu size={20} />
          <span className="menu-icon-pwa" aria-hidden="true">
            <span className="menu-icon-pwa-line menu-icon-pwa-line-long" />
            <span className="menu-icon-pwa-line menu-icon-pwa-line-short" />
          </span>
        </button>
        <Link href="/" className="mobile-brand">
          InsChat
        </Link>
      </div>
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {collapsed && (
        <button
          type="button"
          className="sidebar-expand"
          onClick={toggleCollapsed}
          aria-label={t["nav.showSidebar"]}
        >
          <PanelLeft size={18} />
        </button>
      )}
      <aside
        className={`sidebar${menuOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}
      >
        <div
          className="sidebar-scroll"
          onScroll={(event) => setSidebarScrolled(event.currentTarget.scrollTop > 0)}
        >
        <div className={`sidebar-top${sidebarScrolled ? " scrolled" : ""}`}>
        <div className="sidebar-brand-row">
          <span className="brand-mark">
            <img src="/icon.svg" alt="" />
          </span>
          <span className="brand-name">InsChat</span>
          <button
            type="button"
            className="sidebar-hide"
            onClick={() => setSearchOpen(true)}
            aria-label={t["nav.search"]}
          >
            <Search size={16} />
          </button>
          {user && (
            <button
              type="button"
              className={`sidebar-hide${pathname === "/usage" ? " active" : ""}`}
              onClick={() => router.push("/usage")}
              aria-label={t["nav.usage"]}
              aria-current={pathname === "/usage" ? "page" : undefined}
            >
              <Gauge size={16} />
            </button>
          )}
          <button
            type="button"
            className="sidebar-hide sidebar-collapse"
            onClick={toggleCollapsed}
            aria-label={t["nav.hideSidebar"]}
          >
            <PanelLeft size={16} />
          </button>
        </div>
        </div>
      {authChecked && (
        <div className="session-nav">
          {user && sessions === null ? (
            <p className="session-hint">{t["nav.loading"]}</p>
          ) : (
            <>
              {healthMode &&
                renderSessionSection(
                  "health",
                  t["nav.healthChats"],
                  (user ? ownerList : guestList).filter((session) => session.chatMode === "health"),
                  healthCollapsed,
                  setHealthCollapsed
                )}
              {renderSessionSection(
                "general",
                t["nav.generalChats"],
                (user ? ownerList : guestList).filter((session) => session.chatMode === "general"),
                generalCollapsed,
                setGeneralCollapsed
              )}
            </>
          )}
        </div>
      )}
        </div>
      <div className="sidebar-foot">
        {user ? (
          <div className="account-row">
            <span className="avatar">{user.username.charAt(0).toUpperCase()}</span>
            <span className="account-name">{user.username}</span>
            <button
              type="button"
              className="settings-button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t["nav.settings"]}
            >
              <Settings size={20} />
            </button>
          </div>
        ) : (
          <div className="account-row guest">
            <button
              type="button"
              className="guest-identity"
              onClick={() => setAuthOpen(true)}
              aria-label={t["nav.signIn"]}
            >
              <span className="login-circle" aria-hidden="true">
                <User size={18} />
              </span>
              <span className="guest-name">{t["nav.guest"]}</span>
            </button>
            <button
              type="button"
              className="settings-button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t["nav.settings"]}
            >
              <Settings size={20} />
            </button>
          </div>
        )}
      </div>
    </aside>
    <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} authed={!!user} />
    <AuthModal
      open={authOpen}
      onClose={() => setAuthOpen(false)}
      onAuthed={() => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent("inschat-auth"));
        router.replace("/");
      }}
    />
    {settingsOpen && (
      <>
        <div
          className="settings-backdrop"
          onClick={() => setSettingsOpen(false)}
          aria-hidden="true"
        />
        <div className="settings-modal" role="dialog" aria-modal="true">
          <div className="settings-head">
            <span className="settings-title">{t["settings.title"]}</span>
            <button
              type="button"
              className="settings-close"
              onClick={() => setSettingsOpen(false)}
              aria-label={t["actions.cancel"]}
            >
              <X size={16} />
            </button>
          </div>
          <label className="settings-row">
            <span className="settings-row-icon">
              <Languages size={16} />
            </span>
            <span className="settings-label">{t["settings.language"]}</span>
            <select
              className="settings-select"
              value={lang}
              onChange={(event) => setUiLang(event.target.value as "zh" | "en")}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="settings-row">
            <span className={`settings-row-icon${healthMode ? " health-mode-icon" : ""}`}>
              <HeartPulse size={16} />
            </span>
            <span className="settings-label">{t["settings.healthMode"]}</span>
            <button
              type="button"
              role="switch"
              aria-checked={healthMode}
              className={`switch${healthMode ? " on" : ""}`}
              onClick={() => setHealthMode(!healthMode)}
              aria-label={t["settings.healthMode"]}
            >
              <span className="switch-knob" />
            </button>
          </label>
          {authChecked && user && (
            <label className="settings-row">
              <span className="settings-row-icon">
                <ImageDown size={16} />
              </span>
              <span className="settings-label">{t["settings.compressImages"]}</span>
              <button
                type="button"
                role="switch"
                aria-checked={compressImages}
                className={`switch${compressImages ? " on" : ""}`}
                onClick={() => setCompressImages(!compressImages)}
                aria-label={t["settings.compressImages"]}
              >
                <span className="switch-knob" />
              </button>
            </label>
          )}
          {user && (
            <button
              type="button"
              className="settings-row settings-link"
              onClick={() => {
                setSettingsOpen(false);
                setChangePasswordOpen(true);
              }}
            >
              <span className="settings-row-icon">
                <KeyRound size={16} />
              </span>
              <span className="settings-label">{t["settings.changePassword"]}</span>
              <ChevronRight size={16} />
            </button>
          )}
          {user && (
            <button
              type="button"
              className="settings-row settings-link"
              onClick={() => {
                setSettingsOpen(false);
                void logout();
              }}
            >
              <span className="settings-row-icon">
                <LogOut size={16} />
              </span>
              <span className="settings-label">{t["nav.signOut"]}</span>
              <ChevronRight size={16} />
            </button>
          )}
          {user && (
            <div className="settings-row settings-danger">
              <span className="settings-row-icon settings-danger-icon">
                <Trash2 size={16} />
              </span>
              <span className="settings-label">{t["settings.clearAccountData"]}</span>
              <button
                type="button"
                className="settings-danger-button"
                onClick={() => setClearAccountDataOpen(true)}
              >
                {t["settings.clearAccountData"]}
              </button>
            </div>
          )}
          {!user && (
            <div className="settings-row settings-danger">
              <span className="settings-row-icon settings-danger-icon">
                <Trash2 size={16} />
              </span>
              <span className="settings-label">{t["settings.deleteData"]}</span>
              <button
                type="button"
                className="settings-danger-button"
                onClick={() => setDeleteDataOpen(true)}
              >
                {t["settings.deleteData"]}
              </button>
            </div>
          )}
        </div>
      </>
    )}
    {deleteDataOpen && (
      <ConfirmModal
        title={t["settings.deleteDataTitle"]}
        message={t["settings.deleteDataMessage"]}
        cancelLabel={t["actions.cancel"]}
        confirmLabel={t["settings.deleteDataConfirm"]}
        onCancel={() => setDeleteDataOpen(false)}
        onConfirm={() => {
          resetGuestDataForFreshVisit();
          setGuestSessions([]);
          setDeleteDataOpen(false);
          setSettingsOpen(false);
          router.replace("/?newMode=health");
        }}
      />
    )}
    {clearAccountDataOpen && (
      <ConfirmModal
        title={t["settings.clearAccountDataTitle"]}
        message={t["settings.clearAccountDataMessage"]}
        cancelLabel={t["actions.cancel"]}
        confirmLabel={t["settings.clearAccountDataConfirm"]}
        onCancel={() => setClearAccountDataOpen(false)}
        onConfirm={clearAccountData}
      />
    )}
    {changePasswordOpen && (
      <ChangePasswordModal onClose={() => setChangePasswordOpen(false)} />
    )}
    </>
  );
}
