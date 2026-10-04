"use server";

import { and, count, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  collectOwnedPhotos,
  PHOTO_SAVE_ERROR,
  removeBlobs,
  type OwnedPhoto,
} from "@/lib/photo-blob";
import { event, sessionPhoto, spot, spotPhoto } from "@/lib/schema/spots";
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
const EDIT_FORBIDDEN = "Nie możesz edytować tej sesji.";
const EDIT_FINISHED = "Tej sesji nie można już zmienić.";

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

function urlList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
    .filter((value) => value !== "");
}

function pathnamesOf(rows: { pathname?: string }[]): string[] {
  return rows.flatMap((row) =>
    typeof row.pathname === "string" && row.pathname.length > 0
      ? [row.pathname]
      : [],
  );
}

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function ownedCreatePhotos(
  userId: string,
  sessionUrls: string[],
  spotUrls: string[],
): Promise<
  { ok: true; sessionPhotos: OwnedPhoto[]; spotPhotos: OwnedPhoto[] } | { ok: false }
> {
  const sessionPhotos = await collectOwnedPhotos(userId, "session", sessionUrls);
  if (!sessionPhotos.ok) {
    return { ok: false };
  }
  const spotPhotos = await collectOwnedPhotos(userId, "spot", spotUrls);
  if (!spotPhotos.ok) {
    return { ok: false };
  }
  return {
    ok: true,
    sessionPhotos: sessionPhotos.photos,
    spotPhotos: spotPhotos.photos,
  };
}

async function writeEventPhotos(
  tx: Tx,
  input: {
    eventId: string;
    spotId: string;
    uploaderId: string;
    createdAt: Date;
    sessionPhotos: OwnedPhoto[];
    spotPhotos: OwnedPhoto[];
  },
): Promise<void> {
  for (const photo of input.sessionPhotos) {
    await tx.insert(sessionPhoto).values({
      id: crypto.randomUUID(),
      eventId: input.eventId,
      uploaderId: input.uploaderId,
      blobUrl: photo.blobUrl,
      pathname: photo.pathname,
      featured: false,
      createdAt: input.createdAt,
    });
  }
  for (const photo of input.spotPhotos) {
    await tx.insert(spotPhoto).values({
      id: crypto.randomUUID(),
      spotId: input.spotId,
      uploaderId: input.uploaderId,
      blobUrl: photo.blobUrl,
      pathname: photo.pathname,
      createdAt: input.createdAt,
    });
  }
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
  const sessionPhotoUrls = urlList(formData, "sessionPhotoUrl");
  const spotPhotoUrls = urlList(formData, "spotPhotoUrl");
  const creatorId = session.user.id;
  const now = new Date();
  const eventId = crypto.randomUUID();
  const db = getDb();

  if (spotId) {
    const [existing] = await db
      .select({ id: spot.id, creatorId: spot.creatorId })
      .from(spot)
      .where(eq(spot.id, spotId));
    if (!existing) {
      return { error: PLACE_ERROR };
    }
    if (spotPhotoUrls.length > 0 && existing.creatorId !== creatorId) {
      return { error: PHOTO_SAVE_ERROR };
    }

    const owned = await ownedCreatePhotos(
      creatorId,
      sessionPhotoUrls,
      spotPhotoUrls,
    );
    if (!owned.ok) {
      return { error: PHOTO_SAVE_ERROR };
    }

    try {
      await db.transaction(async (tx) => {
        await tx.insert(event).values({
          id: eventId,
          spotId,
          startsAt,
          endsAt,
          creatorId,
          createdAt: now,
        });
        await writeEventPhotos(tx, {
          eventId,
          spotId,
          uploaderId: creatorId,
          createdAt: now,
          sessionPhotos: owned.sessionPhotos,
          spotPhotos: owned.spotPhotos,
        });
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

  const owned = await ownedCreatePhotos(
    creatorId,
    sessionPhotoUrls,
    spotPhotoUrls,
  );
  if (!owned.ok) {
    return { error: PHOTO_SAVE_ERROR };
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
      await writeEventPhotos(tx, {
        eventId,
        spotId: newSpotId,
        uploaderId: creatorId,
        createdAt: now,
        sessionPhotos: owned.sessionPhotos,
        spotPhotos: owned.spotPhotos,
      });
    });
  } catch {
    return { error: SAVE_ERROR };
  }

  redirect(`/sesja/${eventId}`);
}

export type EditSessionState = {
  error?: string;
};

type EditableEvent = {
  id: string;
  spotId: string;
  creatorId: string;
  startsAt: Date;
  endsAt: Date;
  spotCreatorId: string;
};

function editLoginUrl(eventId: string): string {
  const callback = eventId
    ? `/sesja/${eventId}/edytuj`
    : "/moje";
  return `/logowanie?callbackUrl=${callback}`;
}

async function loadEditableEvent(eventId: string): Promise<EditableEvent | null> {
  const [row] = await getDb()
    .select({
      id: event.id,
      spotId: event.spotId,
      creatorId: event.creatorId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      spotCreatorId: spot.creatorId,
    })
    .from(event)
    .innerJoin(spot, eq(event.spotId, spot.id))
    .where(eq(event.id, eventId))
    .limit(1);
  return row ?? null;
}

function editGateError(
  row: EditableEvent | null,
  userId: string,
  now: Date,
): string | null {
  if (!row || row.creatorId !== userId) {
    return EDIT_FORBIDDEN;
  }
  if (row.endsAt.getTime() <= now.getTime()) {
    return EDIT_FINISHED;
  }
  return null;
}

export async function updateSession(
  _prev: EditSessionState,
  formData: FormData,
): Promise<EditSessionState> {
  const eventId = fieldString(formData.get("eventId"));
  const session = await getSession();
  if (!session) {
    redirect(editLoginUrl(eventId));
  }

  const startRaw = fieldString(formData.get("start"));
  const finishRaw = fieldString(formData.get("finish"));
  if (!eventId || !startRaw || !finishRaw) {
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

  const now = new Date();
  const row = await loadEditableEvent(eventId);
  const gate = editGateError(row, session.user.id, now);
  if (gate || !row) {
    return { error: gate ?? EDIT_FORBIDDEN };
  }

  try {
    await getDb()
      .update(event)
      .set({ startsAt, endsAt })
      .where(
        and(
          eq(event.id, eventId),
          eq(event.creatorId, session.user.id),
          gt(event.endsAt, now),
        ),
      );
  } catch {
    return { error: SAVE_ERROR };
  }

  redirect(`/sesja/${eventId}`);
}

export async function deleteSession(
  _prev: EditSessionState,
  formData: FormData,
): Promise<EditSessionState> {
  const eventId = fieldString(formData.get("eventId"));
  const session = await getSession();
  if (!session) {
    redirect(editLoginUrl(eventId));
  }
  if (!eventId) {
    return { error: EDIT_FORBIDDEN };
  }

  const now = new Date();
  const row = await loadEditableEvent(eventId);
  const gate = editGateError(row, session.user.id, now);
  if (gate || !row) {
    return { error: gate ?? EDIT_FORBIDDEN };
  }

  try {
    const pathnames = await getDb().transaction(async (tx) => {
      const sessionRows = await tx
        .select({ pathname: sessionPhoto.pathname })
        .from(sessionPhoto)
        .where(eq(sessionPhoto.eventId, eventId));
      await tx.delete(sessionPhoto).where(eq(sessionPhoto.eventId, eventId));
      await tx.delete(event).where(
        and(
          eq(event.id, eventId),
          eq(event.creatorId, session.user.id),
          gt(event.endsAt, now),
        ),
      );
      const [remaining] = await tx
        .select({ n: count() })
        .from(event)
        .where(eq(event.spotId, row.spotId));
      const blobPaths = pathnamesOf(sessionRows);
      if (
        Number(remaining?.n ?? 1) === 0 &&
        row.spotCreatorId === session.user.id
      ) {
        const spotRows = await tx
          .select({ pathname: spotPhoto.pathname })
          .from(spotPhoto)
          .where(eq(spotPhoto.spotId, row.spotId));
        await tx.delete(spotPhoto).where(eq(spotPhoto.spotId, row.spotId));
        await tx.delete(spot).where(
          and(eq(spot.id, row.spotId), eq(spot.creatorId, session.user.id)),
        );
        blobPaths.push(...pathnamesOf(spotRows));
      }
      return blobPaths;
    });
    await removeBlobs(pathnames);
  } catch {
    return { error: SAVE_ERROR };
  }

  redirect("/moje");
}
