import { getUserFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    return Response.json({ user: user ?? null });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not check the session.";
    return Response.json({ error: message }, { status: 500 });
  }
}
