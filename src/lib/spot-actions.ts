"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { event, spot } from "@/lib/schema/spots";
import { getSession } from "@/lib/session";
import { parseWarsawLocal } from "@/lib/warsaw-time";

export type CreateSessionState = {
  error?: string;
};

const PLACE_ERROR = "Wybierz miejsce na mapie.";
const COORDS_ERROR = "Niepoprawne współrzędne.";
const TIME_REQUIRED = "Podaj czas rozpoczęcia i zakończenia.";
const TIME_INVALID =
  "Niepoprawny czas. Unikaj godzin, które nie istnieją przy zmianie czasu.";
const TIME_ORDER = "Zakończenie musi być później niż start.";
const SAVE_ERROR = "Nie udało się zapisać sesji. Spróbuj ponownie.";

function fieldString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: FormDataEntryValue | null): string | null {
  const trimmed = fieldString(value);
  if (trimmed === "") {
    return null;
  }
  return trimmed.slice(0, 200);
}

function parseCoord(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
): number | null {
  const raw = fieldString(value);
  if (raw === "") {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    return null;
  }
  return n;
}

export async function createSession(
  _prev: CreateSessionState,
  formData: FormData,
): Promise<CreateSessionState> {
  const session = await getSession();
  if (!session) {
    redirect("/logowanie?callbackUrl=/spot");
  }

  const startRaw = fieldString(formData.get("start"));
  const finishRaw = fieldString(formData.get("finish"));
  if (!startRaw || !finishRaw) {
    return { error: TIME_REQUIRED };
  }

  const startsAt = parseWarsawLocal(startRaw);
  const endsAt = parseWarsawLocal(finishRaw);
  if (!startsAt || !endsAt) {
    return { error: TIME_INVALID };
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { error: TIME_ORDER };
  }

  const spotId = fieldString(formData.get("spotId"));
  const lat = parseCoord(formData.get("lat"), -90, 90);
  const lng = parseCoord(formData.get("lng"), -180, 180);
  const name = normalizeName(formData.get("name"));
  const creatorId = session.user.id;
  const now = new Date();
  const eventId = crypto.randomUUID();
  const db = getDb();

  if (spotId) {
    const [existing] = await db
      .select({ id: spot.id })
      .from(spot)
      .where(eq(spot.id, spotId))
      .limit(1);
    if (!existing) {
      return { error: PLACE_ERROR };
    }

    try {
      await db.insert(event).values({
        id: eventId,
        spotId,
        startsAt,
        endsAt,
        creatorId,
        createdAt: now,
      });
    } catch {
      return { error: SAVE_ERROR };
    }

    redirect(`/sesja/${eventId}`);
  }

  if (lat === null && lng === null) {
    return { error: PLACE_ERROR };
  }
  if (lat === null || lng === null) {
    return { error: COORDS_ERROR };
  }

  const newSpotId = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(spot).values({
        id: newSpotId,
        name,
        lat,
        lng,
        creatorId,
        createdAt: now,
      });
      await tx.insert(event).values({
        id: eventId,
        spotId: newSpotId,
        startsAt,
        endsAt,
        creatorId,
        createdAt: now,
      });
    });
  } catch {
    return { error: SAVE_ERROR };
  }

  redirect(`/sesja/${eventId}`);
}
