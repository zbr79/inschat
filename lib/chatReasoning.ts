import type { ChatMessage, ChatMode } from "./types";

// The GPT-6 gateway currently accepts "none" and "high" reliably for chat.
// "minimal" is rejected, so keep the adaptive policy intentionally binary.
export type ChatReasoning = "none" | "max";

const COMPLEX_PROMPT_PATTERN =
  /\b(analy[sz]e|compare|contrast|trade[- ]?off|research|source|cite|latest|current|today|price|limit|model|api|code|debug|plan|design|step[- ]by[- ]step|explain|why|how)\b/i;

export function chooseChatReasoning(
  messages: ChatMessage[],
  chatMode: ChatMode,
  hasImage: boolean
): ChatReasoning {
  if (hasImage) return "none";
  if (chatMode === "health") return "max";

  const latestUserText =
    [...messages].reverse().find((message) => message.role === "user")?.text.trim() ?? "";
  const totalTextLength = messages.reduce((sum, message) => sum + message.text.length, 0);
  const hasDocuments = messages.some((message) => (message.documents?.length ?? 0) > 0);
  const isComplex =
    hasDocuments ||
    messages.length > 6 ||
    latestUserText.length > 220 ||
    totalTextLength > 6_000 ||
    COMPLEX_PROMPT_PATTERN.test(latestUserText);

  return isComplex ? "max" : "none";
}
