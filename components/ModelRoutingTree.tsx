"use client";

import { STR, useUiLang } from "@/lib/i18n";
import { modelLabel } from "@/lib/modelLabels";

const TEXT_MODEL = "qwen3.8-flash";
const IMAGE_MODEL = "glm-5.3-flash";

export default function ModelRoutingTree() {
  const lang = useUiLang();
  const t = STR[lang];

  const Chain = ({ primary }: { primary: string }) => (
    <span className="routing-chain">
      <span className="routing-model">
        <code>{modelLabel(primary)}</code>
      </span>
      <span className="routing-arrow">→</span>
      <span className="routing-model">
        <code>{t["routing.freeModels"]}</code>
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
          <Chain primary={TEXT_MODEL} />
        </li>
        <li>
          <span className="routing-node">{t["routing.images"]}</span>
          <Chain primary={IMAGE_MODEL} />
        </li>
      </ul>
    </section>
  );
}
