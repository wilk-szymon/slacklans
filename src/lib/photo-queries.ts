import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { event, sessionPhoto, spotPhoto } from "@/lib/schema/spots";

export type SessionPhotoRow = {
  id: string;
  blobUrl: string;
  uploaderId: string;
  createdAt: Date;
};

export type GalleryPhoto = {
  id: string;
  blobUrl: string;
  createdAt: Date;
  kind: "spot" | "session";
};

export type UnfeaturedSessionPhoto = {
  id: string;
  blobUrl: string;
};

type GallerySource = {
  id: string;
  blobUrl: string;
  createdAt: Date;
};

export function mergeGallery(
  spotRows: GallerySource[],
  sessionRows: GallerySource[],
): GalleryPhoto[] {
  const tagged: GalleryPhoto[] = [
    ...spotRows.map((row) => ({ ...row, kind: "spot" as const })),
    ...sessionRows.map((row) => ({ ...row, kind: "session" as const })),
  ];
  tagged.sort((a, b) => {
    const byTime = a.createdAt.getTime() - b.createdAt.getTime();
    if (byTime !== 0) {
      return byTime;
    }
    if (a.id < b.id) {
      return -1;
    }
    if (a.id > b.id) {
      return 1;
    }
    return 0;
  });
  return tagged;
}

export async function loadSessionPhotos(
  eventId: string,
): Promise<SessionPhotoRow[]> {
  return getDb()
    .select({
      id: sessionPhoto.id,
      blobUrl: sessionPhoto.blobUrl,
      uploaderId: sessionPhoto.uploaderId,
      createdAt: sessionPhoto.createdAt,
    })
    .from(sessionPhoto)
    .where(eq(sessionPhoto.eventId, eventId))
    .orderBy(asc(sessionPhoto.createdAt), asc(sessionPhoto.id));
}

export async function loadSpotGallery(spotId: string): Promise<GalleryPhoto[]> {
  const db = getDb();
  const spotRows = await db
    .select({
      id: spotPhoto.id,
      blobUrl: spotPhoto.blobUrl,
      createdAt: spotPhoto.createdAt,
    })
    .from(spotPhoto)
    .where(eq(spotPhoto.spotId, spotId))
    .orderBy(asc(spotPhoto.createdAt), asc(spotPhoto.id));
  const sessionRows = await db
    .select({
      id: sessionPhoto.id,
      blobUrl: sessionPhoto.blobUrl,
      createdAt: sessionPhoto.createdAt,
    })
    .from(sessionPhoto)
    .innerJoin(event, eq(sessionPhoto.eventId, event.id))
    .where(and(eq(event.spotId, spotId), eq(sessionPhoto.featured, true)))
    .orderBy(asc(sessionPhoto.createdAt), asc(sessionPhoto.id));
  return mergeGallery(spotRows, sessionRows);
}

export async function loadUnfeaturedSessionPhotos(
  spotId: string,
): Promise<UnfeaturedSessionPhoto[]> {
  return getDb()
    .select({
      id: sessionPhoto.id,
      blobUrl: sessionPhoto.blobUrl,
    })
    .from(sessionPhoto)
    .innerJoin(event, eq(sessionPhoto.eventId, event.id))
    .where(and(eq(event.spotId, spotId), eq(sessionPhoto.featured, false)))
    .orderBy(asc(sessionPhoto.createdAt), asc(sessionPhoto.id));
}
