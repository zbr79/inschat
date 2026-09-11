import {
  appendReportEntry,
  deleteReportEntry,
  listReportEntries,
  updateReportEntry,
} from "@/lib/db";
import { translateRecord } from "@/lib/translate";
import { requireUser } from "@/lib/auth";
import type { ConcludeItem, ConcludeMeal } from "@/lib/types";
import { parseReportEvents } from "@/lib/reportEvents";

export const runtime = "nodejs";

const MAX_TITLE = 200;
const MAX_SUMMARY = 2000;
const MAX_ITEMS = 20;
const MAX_NAME = 100;
const MAX_VALUE = 500;
const MAX_SOURCE = 16000;
const MAX_IMAGE_KEYS = 100;

function parseImageKeys(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (
    !Array.isArray(raw) ||
    raw.length > MAX_IMAGE_KEYS ||
    raw.some((key) => typeof key !== "string" || key.length > 300)
  ) {
    throw new Error(`"imageKeys" must contain at most ${MAX_IMAGE_KEYS} valid local keys.`);
  }
  return [...new Set(raw as string[])];
}

function parseItems(raw: unknown): ConcludeItem[] {
  if (!Array.isArray(raw) || raw.length > MAX_ITEMS) {
    throw new Error(`"items" must be an array with at most ${MAX_ITEMS} entries.`);
  }
  return raw.map((item, index): ConcludeItem => {
    if (!item || typeof item !== "object") {
      throw new Error(`items[${index}] is invalid.`);
    }
    const { name, value, unit } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim() || name.length > MAX_NAME) {
      throw new Error(`items[${index}].name must be a short non-empty string.`);
    }
    const clean: ConcludeItem = { name };
    if (value !== undefined) {
      if (typeof value !== "string" || value.length > MAX_VALUE) {
        throw new Error(`items[${index}].value is invalid.`);
      }
      if (value) clean.value = value;
    }
    if (unit !== undefined) {
      if (typeof unit !== "string" || unit.length > MAX_VALUE) {
        throw new Error(`items[${index}].unit is invalid.`);
      }
      if (unit) clean.unit = unit;
    }
    return clean;
  });
}

function parseMeals(raw: unknown): ConcludeMeal[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > MAX_ITEMS) {
    throw new Error(`"meals" must be an array with at most ${MAX_ITEMS} entries.`);
  }
  return raw.map((meal, index): ConcludeMeal => {
    if (!meal || typeof meal !== "object") {
      throw new Error(`meals[${index}] is invalid.`);
    }
    const { name, foods, dishes, time } = meal as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim() || name.length > MAX_NAME) {
      throw new Error(`meals[${index}].name must be a short non-empty string.`);
    }
    const clean: ConcludeMeal = { name };
    if (foods !== undefined) {
      if (typeof foods !== "string" || foods.length > MAX_VALUE) {
        throw new Error(`meals[${index}].foods is invalid.`);
      }
      if (foods) clean.foods = foods;
    }
    if (dishes !== undefined) {
      if (!Array.isArray(dishes) || dishes.length > 30) {
        throw new Error(`meals[${index}].dishes is invalid.`);
      }
      clean.dishes = dishes.map((dish, dishIndex): { name: string; rank?: string } => {
        if (!dish || typeof dish !== "object") {
          throw new Error(`meals[${index}].dishes[${dishIndex}] is invalid.`);
        }
        const { name: dishName, rank } = dish as Record<string, unknown>;
        if (
          typeof dishName !== "string" ||
          !dishName.trim() ||
          dishName.length > MAX_NAME
        ) {
          throw new Error(`meals[${index}].dishes[${dishIndex}].name is invalid.`);
        }
        const cleanDish: { name: string; rank?: string } = { name: dishName };
        if (rank !== undefined) {
          if (typeof rank !== "string" || rank.length > MAX_VALUE) {
            throw new Error(`meals[${index}].dishes[${dishIndex}].rank is invalid.`);
          }
          if (rank) cleanDish.rank = rank;
        }
        return cleanDish;
      });
    }
    if (time !== undefined) {
      if (typeof time !== "string" || time.length > MAX_VALUE) {
        throw new Error(`meals[${index}].time is invalid.`);
      }
      if (time) clean.time = time;
    }
    return clean;
  });
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  try {
    const records = await listReportEntries(auth._id);
    return Response.json({ records });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load records.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  let title: string;
  let summary: string;
  let items: ConcludeItem[];
  let meals: ConcludeMeal[] | undefined;
  let sourceText: string | undefined;
  let imageKeys: string[] | undefined;
  let events: ReturnType<typeof parseReportEvents>;
  let sessionId: string | undefined;
  let recordedAt: string | undefined;
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      throw new Error("Request body must be a JSON object.");
    }
    const {
      title: rawTitle,
      summary: rawSummary,
      items: rawItems,
      meals: rawMeals,
      sourceText: rawSource,
      imageKeys: rawImageKeys,
      events: rawEvents,
      sessionId: rawSessionId,
      recordedAt: rawRecordedAt,
    } = body as Record<string, unknown>;
    if (typeof rawTitle !== "string" || !rawTitle.trim() || rawTitle.length > MAX_TITLE) {
      throw new Error('"title" must be a short non-empty string.');
    }
    title = rawTitle;
    if (typeof rawSummary !== "string" || rawSummary.length > MAX_SUMMARY) {
      throw new Error('"summary" is invalid.');
    }
    summary = rawSummary;
    items = parseItems(rawItems);
    meals = parseMeals(rawMeals);
    if (rawSource !== undefined) {
      if (typeof rawSource !== "string" || rawSource.length > MAX_SOURCE) {
        throw new Error('"sourceText" is invalid.');
      }
      sourceText = rawSource;
    }
    imageKeys = parseImageKeys(rawImageKeys);
    events = parseReportEvents(rawEvents);
    if (rawSessionId !== undefined) {
      if (typeof rawSessionId !== "string" || rawSessionId.length > 200) {
        throw new Error('"sessionId" is invalid.');
      }
      sessionId = rawSessionId;
    }
    if (rawRecordedAt !== undefined) {
      if (typeof rawRecordedAt !== "string" || rawRecordedAt.length > 100) {
        throw new Error('"recordedAt" is invalid.');
      }
      recordedAt = rawRecordedAt;
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request body." },
      { status: 400 }
    );
  }

  try {
    const translated = translateRecord({ title, summary, items, meals, sourceText });
    const record = await appendReportEntry(auth._id, {
      ...translated,
      imageKeys,
      events,
      sessionId,
      recordedAt,
    });
    return Response.json({ record }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save the record.";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Update an existing record in place — one conclusion per chat grows by
// editing its single record instead of creating duplicates.
export async function PUT(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: '"id" query parameter is required.' }, { status: 400 });
  }

  let title: string;
  let summary: string;
  let items: ConcludeItem[];
  let meals: ConcludeMeal[] | undefined;
  let sourceText: string | undefined;
  let imageKeys: string[] | undefined;
  let events: ReturnType<typeof parseReportEvents>;
  let sessionId: string | undefined;
  let recordedAt: string | undefined;
  let pinned: boolean | undefined;
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object") {
      throw new Error("Request body must be a JSON object.");
    }
    const {
      title: rawTitle,
      summary: rawSummary,
      items: rawItems,
      meals: rawMeals,
      sourceText: rawSource,
      imageKeys: rawImageKeys,
      events: rawEvents,
      sessionId: rawSessionId,
      recordedAt: rawRecordedAt,
      pinned: rawPinned,
    } = body as Record<string, unknown>;
    if (typeof rawTitle !== "string" || !rawTitle.trim() || rawTitle.length > MAX_TITLE) {
      throw new Error('"title" must be a short non-empty string.');
    }
    title = rawTitle;
    if (typeof rawSummary !== "string" || rawSummary.length > MAX_SUMMARY) {
      throw new Error('"summary" is invalid.');
    }
    summary = rawSummary;
    items = parseItems(rawItems);
    meals = parseMeals(rawMeals);
    if (rawSource !== undefined) {
      if (typeof rawSource !== "string" || rawSource.length > MAX_SOURCE) {
        throw new Error('"sourceText" is invalid.');
      }
      sourceText = rawSource;
    }
    imageKeys = parseImageKeys(rawImageKeys);
    events = parseReportEvents(rawEvents);
    if (rawSessionId !== undefined) {
      if (typeof rawSessionId !== "string" || rawSessionId.length > 200) {
        throw new Error('"sessionId" is invalid.');
      }
      sessionId = rawSessionId;
    }
    if (rawRecordedAt !== undefined) {
      if (typeof rawRecordedAt !== "string" || rawRecordedAt.length > 100) {
        throw new Error('"recordedAt" is invalid.');
      }
      recordedAt = rawRecordedAt;
    }
    if (rawPinned !== undefined) {
      if (typeof rawPinned !== "boolean") {
        throw new Error('"pinned" is invalid.');
      }
      pinned = rawPinned;
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request body." },
      { status: 400 }
    );
  }

  try {
    const translated = translateRecord({ title, summary, items, meals, sourceText });
    const record = await updateReportEntry(auth._id, id, {
      ...translated,
      imageKeys,
      events,
      sessionId,
      recordedAt,
      pinned,
    });
    if (!record) {
      return Response.json({ error: "Record not found." }, { status: 404 });
    }
    return Response.json({ record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update the record.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: '"id" query parameter is required.' }, { status: 400 });
  }
  try {
    const deleted = await deleteReportEntry(auth._id, id);
    if (!deleted) {
      return Response.json({ error: "Record not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete the record.";
    return Response.json({ error: message }, { status: 500 });
  }
}
