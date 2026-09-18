"use client";

import { AlertCircle, Eye, Trash2 } from "lucide-react";
import { STR, useUiLang } from "@/lib/i18n";

export type HealthIntroChoice = "view" | "clear";

export default function HealthIntroModal({
  onChoice,
}: {
  onChoice: (choice: HealthIntroChoice) => void;
}) {
  const lang = useUiLang();
  const t = STR[lang];

  return (
    <>
      <div className="health-intro-backdrop" aria-hidden="true" />
      <div
        className="health-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-intro-title"
        aria-describedby="health-intro-description"
      >
        <div className="health-intro-card">
          <div className="health-intro-title-row">
            <span className="health-intro-icon" aria-hidden="true">
              <AlertCircle size={18} strokeWidth={2.2} />
            </span>
            <h2 id="health-intro-title">{t["healthIntro.title"]}</h2>
          </div>
          <p id="health-intro-description">{t["healthIntro.description"]}</p>
          <div className="health-intro-actions">
            <button type="button" className="health-intro-secondary" onClick={() => onChoice("clear")}>
              <Trash2 size={16} aria-hidden="true" />
              {t["healthIntro.clear"]}
            </button>
            <button type="button" className="health-intro-primary" onClick={() => onChoice("view")}>
              <Eye size={16} aria-hidden="true" />
              {t["healthIntro.view"]}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
