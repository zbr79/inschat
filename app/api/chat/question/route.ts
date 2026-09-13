import {
  answerPendingQuestion,
  getPendingQuestion,
} from "@/lib/pendingQuestion";
import {
  QuestionValidationError,
  validateQuestionAnswers,
} from "@/lib/question";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== "object") {
      return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
    }
    body = raw as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : undefined;
  const action =
    body.action === "reject" ? "reject" : body.action === "reply" ? "reply" : "";
  if (!requestId || (action !== "reply" && action !== "reject")) {
    return Response.json({ error: "Invalid question request." }, { status: 400 });
  }

  const pending = getPendingQuestion(requestId);
  if (!pending || pending.sessionId !== sessionId) {
    return Response.json({ error: "This question expired." }, { status: 410 });
  }

  try {
    const answer =
      action === "reply"
        ? { answers: validateQuestionAnswers(pending, body.answers) }
        : {
            answers: pending.questions.map(() => [""]),
            rejected: true,
          };
    if (!answerPendingQuestion(requestId, sessionId, answer)) {
      return Response.json({ error: "This question expired." }, { status: 410 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof QuestionValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "Could not send the answer." }, { status: 500 });
  }
}
