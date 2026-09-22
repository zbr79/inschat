"use client";

import { HeartPulse, ImageDown, Languages, Sun, Trash2, X } from "lucide-react";
import type { ThemeMode } from "@/lib/prefs";
import type { UiLang } from "@/lib/i18n";

interface SystemSettingsModalProps {
  t: Record<string, string>;
  lang: UiLang;
  onLangChange: (lang: UiLang) => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  healthMode: boolean;
  onHealthModeChange: (on: boolean) => void;
  compressImages: boolean;
  onCompressImagesChange: (on: boolean) => void;
  signedIn: boolean;
  onDeleteGuestData: () => void;
  onClose: () => void;
}

export default function SystemSettingsModal({
  t,
  lang,
  onLangChange,
  themeMode,
  onThemeChange,
  healthMode,
  onHealthModeChange,
  compressImages,
  onCompressImagesChange,
  signedIn,
  onDeleteGuestData,
  onClose,
}: SystemSettingsModalProps) {
  return (
    <>
      <div className="settings-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="settings-modal" role="dialog" aria-modal="true">
        <div className="settings-head">
          <span className="settings-title">{t["settings.title"]}</span>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
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
            onChange={(event) => onLangChange(event.target.value as UiLang)}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="settings-row">
          <span className="settings-row-icon">
            <Sun size={16} />
          </span>
          <span className="settings-label">{t["settings.theme"]}</span>
          <select
            className="settings-select"
            value={themeMode}
            onChange={(event) =>
              onThemeChange(event.target.value as ThemeMode)
            }
            aria-label={t["settings.theme"]}
          >
            <option value="system">{t["settings.theme.system"]}</option>
            <option value="light">{t["settings.theme.light"]}</option>
            <option value="dark">{t["settings.theme.dark"]}</option>
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
            onClick={() => onHealthModeChange(!healthMode)}
            aria-label={t["settings.healthMode"]}
          >
            <span className="switch-knob" />
          </button>
        </label>
        {signedIn && (
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
              onClick={() => onCompressImagesChange(!compressImages)}
              aria-label={t["settings.compressImages"]}
            >
              <span className="switch-knob" />
            </button>
          </label>
        )}
        {!signedIn && (
          <div className="settings-row settings-danger">
            <span className="settings-row-icon settings-danger-icon">
              <Trash2 size={16} />
            </span>
            <span className="settings-label">{t["settings.deleteData"]}</span>
            <button
              type="button"
              className="settings-danger-button"
              onClick={onDeleteGuestData}
            >
              {t["settings.deleteData"]}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
