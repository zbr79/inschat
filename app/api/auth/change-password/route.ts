import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  changeUserPassword,
  requireUser,
} from "@/lib/auth";

export const runtime = "nodejs";

function errorResponse(
  error: string,
  errorCode: string,
  status: number,
  extra?: Record<string, number>
) {
  return Response.json({ error, errorCode, ...extra }, { status });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      return errorResponse("Request body must be a JSON object.", "invalidBody", 400);
    }
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = body as Record<string, unknown>;

    if (typeof currentPassword !== "string" || !currentPassword) {
      return errorResponse("Current password is required.", "currentPasswordRequired", 400);
    }
    if (typeof newPassword !== "string" || !newPassword) {
      return errorResponse("New password is required.", "passwordRequired", 400);
    }
    if (
      newPassword.length < PASSWORD_MIN ||
      newPassword.length > PASSWORD_MAX
    ) {
      return errorResponse(
        `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters.`,
        "passwordLength",
        400,
        { min: PASSWORD_MIN, max: PASSWORD_MAX }
      );
    }
    if (newPassword !== confirmPassword) {
      return errorResponse("Passwords do not match.", "passwordMismatch", 400);
    }

    const changed = await changeUserPassword(
      auth._id,
      currentPassword,
      newPassword
    );
    if (!changed) {
      return errorResponse("Current password is incorrect.", "invalidCurrentPassword", 401);
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Could not change password.",
      "server",
      500
    );
  }
}
