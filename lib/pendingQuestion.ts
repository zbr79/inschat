import type {
  PendingQuestion,
  QuestionAnswer,
} from "./question";

interface PendingEntry {
  question: PendingQuestion;
  resolve: (answer: QuestionAnswer) => void;
  timer: ReturnType<typeof setTimeout>;
}

const QUESTION_TIMEOUT_MS = 30 * 60 * 1000;
const pending = new Map<string, PendingEntry>();

export function getPendingQuestion(requestId: string): PendingQuestion | null {
  return pending.get(requestId)?.question ?? null;
}

export function waitForQuestionAnswer(
  question: PendingQuestion
): Promise<QuestionAnswer> {
  const previous = pending.get(question.requestId);
  if (previous) {
    clearTimeout(previous.timer);
    previous.resolve({ answers: [[]], rejected: true });
  }

  return new Promise<QuestionAnswer>((resolve) => {
    const timer = setTimeout(() => {
      const current = pending.get(question.requestId);
      if (!current) return;
      pending.delete(question.requestId);
      resolve({
        answers: question.questions.map(() => [""]),
        rejected: true,
      });
    }, QUESTION_TIMEOUT_MS);
    pending.set(question.requestId, { question, resolve, timer });
  });
}

export function answerPendingQuestion(
  requestId: string,
  sessionId: string | undefined,
  answer: QuestionAnswer
): boolean {
  const entry = pending.get(requestId);
  if (!entry) return false;
  if (entry.question.sessionId !== sessionId) return false;
  clearTimeout(entry.timer);
  pending.delete(requestId);
  entry.resolve(answer);
  return true;
}
