"use client";

import { Activity, Eye, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { STR, setUiLang, useUiLang } from "@/lib/i18n";
import {
  applyVisitorChoice,
  useVisitorIntent,
  type VisitorIntent,
} from "@/lib/visitorIntent";

const OPTIONS: {
  id: VisitorIntent;
  icon: typeof MessageCircle;
  titleKey: "visitor.chat.title" | "visitor.glucose.title" | "visitor.review.title";
  subKey: "visitor.chat.sub" | "visitor.glucose.sub" | "visitor.review.sub";
}[] = [
  {
    id: "chat",
    icon: MessageCircle,
    titleKey: "visitor.chat.title",
    subKey: "visitor.chat.sub",
  },
  {
    id: "glucose",
    icon: Activity,
    titleKey: "visitor.glucose.title",
    subKey: "visitor.glucose.sub",
  },
  {
    id: "review",
    icon: Eye,
    titleKey: "visitor.review.title",
    subKey: "visitor.review.sub",
  },
];

function VisitorWelcome() {
  const lang = useUiLang();
  const t = STR[lang];
  const router = useRouter();

  return (
    <div className="visitor-welcome">
      <div className="visitor-welcome-head">
        <h2>{t["welcome.title"]}</h2>
        <button
          type="button"
          className="auth-lang-toggle"
          onClick={() => setUiLang(lang === "zh" ? "en" : "zh")}
          aria-label={t["settings.language"]}
        >
          {t["lang.button"]}
        </button>
      </div>
      <div className="visitor-options">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              className="visitor-option"
              onClick={() => router.push(applyVisitorChoice(option.id))}
            >
              <span className="visitor-option-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.1} />
              </span>
              <span className="visitor-option-copy">
                <strong>{t[option.titleKey]}</strong>
                <small>{t[option.subKey]}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function VisitorGuide({
  guest,
  empty,
  children,
}: {
  guest: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  const { ready, intent } = useVisitorIntent();
  if (guest && empty && !ready) return null;
  if (guest && empty && ready && intent === null) return <VisitorWelcome />;
  return children;
}
