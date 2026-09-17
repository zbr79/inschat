"use client";

import { STR, useUiLang } from "@/lib/i18n";

export default function ReviewCoach({
  onDismiss,
  onTryHealthChat,
}: {
  onDismiss: () => void;
  onTryHealthChat: () => void;
}) {
  const lang = useUiLang();
  const t = STR[lang];

  return (
    <aside
      className="review-coach"
      role="region"
      aria-labelledby="review-coach-title"
    >
      <h2 id="review-coach-title">{t["reviewCoach.title"]}</h2>
      <ol className="review-coach-steps">
        <li>{t["reviewCoach.step1"]}</li>
        <li>{t["reviewCoach.step2"]}</li>
        <li>{t["reviewCoach.step3"]}</li>
      </ol>
      <div className="review-coach-actions">
        <button type="button" className="auth-button" onClick={onTryHealthChat}>
          {t["reviewCoach.tryHealth"]}
        </button>
        <button type="button" className="review-coach-dismiss" onClick={onDismiss}>
          {t["reviewCoach.dismiss"]}
        </button>
      </div>
    </aside>
  );
}
