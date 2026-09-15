"use client";

import { Activity, MessageCircle } from "lucide-react";
import type { ChatMode } from "@/lib/types";
import { STR, useUiLang } from "@/lib/i18n";

export default function ChatModeBadge({ mode }: { mode: ChatMode }) {
  const lang = useUiLang();
  const t = STR[lang];
  const health = mode === "health";
  const Icon = health ? Activity : MessageCircle;

  return (
    <div className={`chat-mode-badge${health ? " health" : " general"}`}>
      <Icon size={15} aria-hidden="true" />
      <span>
        <strong>{health ? t["chatMode.health"] : t["chatMode.general"]}</strong>
        <small>{t["chatMode.locked"]}</small>
      </span>
    </div>
  );
}
