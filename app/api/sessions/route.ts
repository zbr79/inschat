import { clearAllAccountData, insertSession, listSessions } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { ChatMode } from "@/lib/types";

export const runtime = "nodejs";

const MAX_TITLE = 120;

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  try {
    const sessions = await listSessions(auth._id, 50);
    return Response.json({ sessions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load sessions.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  let title: string;
  let chatMode: ChatMode = "general";
  let temporary = false;
  try {
    const body: unknown = await req.json();
    const rawTitle =
      body && typeof body === "object"
        ? (body as { title?: unknown }).title
        : undefined;
    if (rawTitle === undefined) {
      title = "New chat";
    } else if (typeof rawTitle !== "string" || rawTitle.length > MAX_TITLE) {
      return Response.json(
        { error: `"title" must be a string with at most ${MAX_TITLE} characters.` },
        { status: 400 }
      );
    } else {
      title = rawTitle.trim() || "New chat";
    }
    const rawChatMode =
      body && typeof body === "object"
        ? (body as { chatMode?: unknown }).chatMode
        : undefined;
    if (rawChatMode !== undefined) {
      if (rawChatMode !== "health" && rawChatMode !== "general") {
        return Response.json(
          { error: '"chatMode" must be "health" or "general".' },
          { status: 400 }
        );
      }
      chatMode = rawChatMode;
    }
    const rawTemporary =
      body && typeof body === "object"
        ? (body as { temporary?: unknown }).temporary
        : undefined;
    if (rawTemporary !== undefined) {
      if (typeof rawTemporary !== "boolean") {
        return Response.json(
          { error: '"temporary" must be a boolean.' },
          { status: 400 }
        );
      }
      temporary = rawTemporary;
    }
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const session = await insertSession(auth._id, title, chatMode, temporary);
    return Response.json({ session }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create the session.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  if (new URL(req.url).searchParams.get("all") !== "1") {
    return Response.json({ error: '"all=1" is required.' }, { status: 400 });
  }
  try {
    await clearAllAccountData(auth._id);
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not clear account data.";
    return Response.json({ error: message }, { status: 500 });
  }
}
