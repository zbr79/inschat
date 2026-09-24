"use client";

import { STR, useUiLang } from "@/lib/i18n";
import { modelLabel } from "@/lib/modelLabels";

const PRIMARY_MODEL = "gpt-6-luna";
const FALLBACK_MODEL = "glm-5.3-flash";

export default function ModelRoutingTree() {
  const lang = useUiLang();
  const t = STR[lang];

  const Chain = () => (
    <span className="routing-chain">
      <span className="routing-model">
        <code>{modelLabel(PRIMARY_MODEL)}</code>
      </span>
      <span className="routing-arrow">→</span>
      <span className="routing-model">
        <code>{modelLabel(FALLBACK_MODEL)}</code>
      </span>
      <span className="routing-arrow">→</span>
      <span className="routing-model">
        <code>{t["routing.unavailable"]}</code>
      </span>
    </span>
  );

  return (
    <section className="usage-card routing-card">
      <span className="usage-title">{t["routing.title"]}</span>
      <p className="usage-sub">{t["routing.note"]}</p>

      <ul className="routing-tree">
        <li>
          <span className="routing-node">{t["routing.textChat"]}</span>
          <Chain />
        </li>
        <li>
          <span className="routing-node">{t["routing.images"]}</span>
          <Chain />
        </li>
      </ul>
    </section>
  );
}
