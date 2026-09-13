"use client";

import { useState } from "react";
import { STR, useUiLang } from "@/lib/i18n";

export default function ClarificationReply({
  clarification,
  onSubmit,
  onDismiss,
}: {
  clarification: {
    question: string;
    options?: { label: string; description?: string }[];
  };
  onSubmit: (answer: string) => void;
  onDismiss?: () => void;
}) {
  const lang = useUiLang();
  const t = STR[lang];
  const [selected, setSelected] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(!clarification.options);
  const [customText, setCustomText] = useState("");

  const submitCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const choose = (label: string) => {
    setSelected(label);
    setCustomOpen(false);
    onSubmit(label);
  };

  return (
    <section className="question-card" aria-live="polite">
      {onDismiss ? (
        <button type="button" className="question-reject" onClick={onDismiss}>
          {t["question.reject"]}
        </button>
      ) : null}
      <div className="question-item">
        <p className="question-item-header">{clarification.question}</p>
        {clarification.options ? (
          <div className="question-options" role="radiogroup">
            {clarification.options.map((option) => {
              const selectedOption = !customOpen && selected === option.label;
              return (
                <button
                  type="button"
                  key={option.label}
                  className={`question-option${selectedOption ? " selected" : ""}`}
                  aria-pressed={selectedOption}
                  onClick={() => choose(option.label)}
                >
                  <span className="question-option-label">{option.label}</span>
                  {option.description ? (
                    <span className="question-option-desc">{option.description}</span>
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              className={`question-option${customOpen ? " selected" : ""}`}
              aria-pressed={customOpen}
              onClick={() => {
                setSelected(null);
                setCustomOpen(true);
              }}
            >
              <span className="question-option-label">{t["question.other"]}</span>
            </button>
          </div>
        ) : null}
        {customOpen ? (
          <input
            className="question-custom"
            value={customText}
            maxLength={500}
            autoFocus
            onChange={(event) => {
              setCustomText(event.target.value);
              setSelected(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCustom();
              }
            }}
            placeholder={
              clarification.options
                ? t["clarification.otherPlaceholder"]
                : t["clarification.placeholder"]
            }
            aria-label={t["clarification.placeholder"]}
          />
        ) : null}
      </div>
    </section>
  );
}
