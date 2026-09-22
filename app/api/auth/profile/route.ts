import { changeUserDisplayName, requireUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_DISPLAY_NAME = 64;

function errorResponse(error: string, errorCode: string, status: number) {
  return Response.json({ error, errorCode }, { status });
}

export async function PATCH(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  let displayName: string;
  try {
    const body: unknown = await req.json();
    const rawDisplayName =
      body && typeof body === "object"
        ? (body as { displayName?: unknown }).displayName
        : undefined;
    if (typeof rawDisplayName !== "string" || !rawDisplayName.trim()) {
      return errorResponse(
        "Display name is required.",
        "displayNameRequired",
        400
      );
    }
    displayName = rawDisplayName.trim();
    if (displayName.length > MAX_DISPLAY_NAME) {
      return errorResponse(
        `Display name must be at most ${MAX_DISPLAY_NAME} characters.`,
        "displayNameTooLong",
        400
      );
    }
  } catch {
    return errorResponse("Invalid request body.", "invalidBody", 400);
  }

  try {
    const updated = await changeUserDisplayName(auth._id, displayName);
    if (!updated) {
      return errorResponse("Could not update the display name.", "updateFailed", 500);
    }
    return Response.json({
      user: {
        username: auth.username,
        displayName,
      },
    });
  } catch {
    return errorResponse("Could not update the display name.", "updateFailed", 500);
  }
}
