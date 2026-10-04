"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { collectOwnedPhotos, PHOTO_SAVE_ERROR, removeBlobs } from "@/lib/photo-blob";
import { safeCallbackPath } from "@/lib/safe-callback-path";
import { event, sessionPhoto, spot, spotPhoto } from "@/lib/schema/spots";
import { getSession } from "@/lib/session";

export type PhotoActionState = {
  error?: string;
};

async function requireUser(callbackPath: string): Promise<string> {
  const session = await getSession();
  if (!session) {
    redirect(
      `/logowanie?callbackUrl=${encodeURIComponent(safeCallbackPath(callbackPath))}`,
    );
  }
  return session.user.id;
}

export async function addSessionPhoto(
  eventId: string,
  url: string,
): Promise<PhotoActionState> {
  const id = eventId.trim();
  const userId = await requireUser(id ? `/sesja/${id}` : "/");
  const photoUrl = url.trim();
  if (!id || !photoUrl) {
    return { error: PHOTO_SAVE_ERROR };
  }

  const owned = await collectOwnedPhotos(userId, "session", [photoUrl]);
  if (!owned.ok) {
    return { error: PHOTO_SAVE_ERROR };
  }
  const photo = owned.photos[0];
  if (!photo) {
    return { error: PHOTO_SAVE_ERROR };
  }

  const [existing] = await getDb()
    .select({ id: event.id })
    .from(event)
    .where(eq(event.id, id))
    .limit(1);
  if (!existing) {
    return { error: PHOTO_SAVE_ERROR };
  }

  try {
    await getDb().insert(sessionPhoto).values({
      id: crypto.randomUUID(),
      eventId: id,
      uploaderId: userId,
      blobUrl: photo.blobUrl,
      pathname: photo.pathname,
      featured: false,
      createdAt: new Date(),
    });
  } catch {
    return { error: PHOTO_SAVE_ERROR };
  }
  return {};
}

export async function deleteSessionPhoto(
  photoId: string,
): Promise<PhotoActionState> {
  const userId = await requireUser("/");
  const id = photoId.trim();
  if (!id) {
    return { error: PHOTO_SAVE_ERROR };
  }

  let pathname: string | null = null;
  try {
    pathname = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .select({
          pathname: sessionPhoto.pathname,
          uploaderId: sessionPhoto.uploaderId,
        })
        .from(sessionPhoto)
        .where(eq(sessionPhoto.id, id))
        .limit(1);
      if (!row || row.uploaderId !== userId) {
        return null;
      }
      await tx
        .delete(sessionPhoto)
        .where(and(eq(sessionPhoto.id, id), eq(sessionPhoto.uploaderId, userId)));
      return row.pathname;
    });
  } catch {
    return { error: PHOTO_SAVE_ERROR };
  }
  if (!pathname) {
    return { error: PHOTO_SAVE_ERROR };
  }
  await removeBlobs([pathname]);
  return {};
}

export async function addSpotPhoto(
  spotId: string,
  url: string,
): Promise<PhotoActionState> {
  const id = spotId.trim();
  const userId = await requireUser(id ? `/miejsce/${id}` : "/");
  const photoUrl = url.trim();
  if (!id || !photoUrl) {
    return { error: PHOTO_SAVE_ERROR };
  }

  const [place] = await getDb()
    .select({ creatorId: spot.creatorId })
    .from(spot)
    .where(eq(spot.id, id))
    .limit(1);
  if (!place || place.creatorId !== userId) {
    return { error: PHOTO_SAVE_ERROR };
  }

  const owned = await collectOwnedPhotos(userId, "spot", [photoUrl]);
  if (!owned.ok) {
    return { error: PHOTO_SAVE_ERROR };
  }
  const photo = owned.photos[0];
  if (!photo) {
    return { error: PHOTO_SAVE_ERROR };
  }

  try {
    await getDb().insert(spotPhoto).values({
      id: crypto.randomUUID(),
      spotId: id,
      uploaderId: userId,
      blobUrl: photo.blobUrl,
      pathname: photo.pathname,
      createdAt: new Date(),
    });
  } catch {
    return { error: PHOTO_SAVE_ERROR };
  }
  return {};
}

export async function deleteSpotPhoto(
  photoId: string,
): Promise<PhotoActionState> {
  const userId = await requireUser("/");
  const id = photoId.trim();
  if (!id) {
    return { error: PHOTO_SAVE_ERROR };
  }

  let pathname: string | null = null;
  try {
    pathname = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .select({
          pathname: spotPhoto.pathname,
          creatorId: spot.creatorId,
        })
        .from(spotPhoto)
        .innerJoin(spot, eq(spotPhoto.spotId, spot.id))
        .where(eq(spotPhoto.id, id))
        .limit(1);
      if (!row || row.creatorId !== userId) {
        return null;
      }
      await tx.delete(spotPhoto).where(eq(spotPhoto.id, id));
      return row.pathname;
    });
  } catch {
    return { error: PHOTO_SAVE_ERROR };
  }
  if (!pathname) {
    return { error: PHOTO_SAVE_ERROR };
  }
  await removeBlobs([pathname]);
  return {};
}

async function setFeatured(
  photoId: string,
  featured: boolean,
): Promise<PhotoActionState> {
  const userId = await requireUser("/");
  const id = photoId.trim();
  if (!id) {
    return { error: PHOTO_SAVE_ERROR };
  }

  try {
    const updated = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .select({ creatorId: spot.creatorId })
        .from(sessionPhoto)
        .innerJoin(event, eq(sessionPhoto.eventId, event.id))
        .innerJoin(spot, eq(event.spotId, spot.id))
        .where(eq(sessionPhoto.id, id))
        .limit(1);
      if (!row || row.creatorId !== userId) {
        return false;
      }
      await tx
        .update(sessionPhoto)
        .set({ featured })
        .where(eq(sessionPhoto.id, id));
      return true;
    });
    if (!updated) {
      return { error: PHOTO_SAVE_ERROR };
    }
  } catch {
    return { error: PHOTO_SAVE_ERROR };
  }
  return {};
}

export async function featureSessionPhoto(
  photoId: string,
): Promise<PhotoActionState> {
  return setFeatured(photoId, true);
}

export async function unfeatureSessionPhoto(
  photoId: string,
): Promise<PhotoActionState> {
  return setFeatured(photoId, false);
}
