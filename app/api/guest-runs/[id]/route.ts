import {
  finalizePendingGuestRun,
  getLatestGuestRun,
} from "@/lib/guestRunStore";

export const runtime = "nodejs";

const MAX_TEXT = 100_000;

function toStoredLike(run: NonNullable<Awaited<ReturnType<typeof getLatestGuestRun>>>) {
  return {
    _id: run.messageId,
    sessionId: run.sessionId,
    role: "model" as const,
    text: run.text,
    model: run.model,
    trying: run.trying,
    elapsed: run.elapsed,
    createdAt: new Date(run.startedAt).toISOString(),
    status: run.status,
    startedAt: new Date(run.startedAt).toISOString(),
    updatedAt: new Date(run.updatedAt).toISOString(),
    processSteps: run.processSteps,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const run = await getLatestGuestRun(id);
    return Response.json({ run: run ? toStoredLike(run) : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the run.";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Client-driven finalize: the browser saw the whole answer, so close the
// pending guest run even if the /api/chat handler died at the same moment.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const rawText = body.text;
  if (rawText !== undefined && (typeof rawText !== "string" || rawText.length > MAX_TEXT)) {
    return Response.json({ error: '"text" must be a string within size limits.' }, { status: 400 });
  }
  const rawElapsed = body.elapsed;
  if (
    rawElapsed !== undefined &&
    (typeof rawElapsed !== "number" ||
      !Number.isFinite(rawElapsed) ||
      rawElapsed < 0 ||
      rawElapsed > 3600)
  ) {
    return Response.json({ error: '"elapsed" is invalid.' }, { status: 400 });
  }
  const messageId = typeof body.messageId === "string" ? body.messageId : undefined;
  try {
    const finalized = await finalizePendingGuestRun(id, {
      text: typeof rawText === "string" ? rawText : undefined,
      elapsed: typeof rawElapsed === "number" ? rawElapsed : undefined,
      messageId,
    });
    return Response.json({ finalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finalize the run.";
    return Response.json({ error: message }, { status: 500 });
  }
}
