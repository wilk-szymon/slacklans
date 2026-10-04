import { del, head } from "@vercel/blob";
import {
  isAllowedPhotoPath,
  isPhotoContentType,
  MAX_PHOTO_BYTES,
  type PhotoKind,
} from "@/lib/blob-upload";

export { PHOTO_SAVE_ERROR } from "@/lib/blob-upload";

export type OwnedPhoto = {
  blobUrl: string;
  pathname: string;
};

export type CollectResult =
  | { ok: true; photos: OwnedPhoto[] }
  | { ok: false };

async function ownedBlob(
  userId: string,
  kind: PhotoKind,
  url: string,
): Promise<OwnedPhoto | null> {
  if (!url.startsWith("https://")) {
    return null;
  }
  let meta;
  try {
    meta = await head(url);
  } catch {
    return null;
  }
  if (!isPhotoContentType(meta.contentType)) {
    return null;
  }
  if (!Number.isFinite(meta.size) || meta.size < 0 || meta.size > MAX_PHOTO_BYTES) {
    return null;
  }
  if (!isAllowedPhotoPath(kind, userId, meta.pathname)) {
    return null;
  }
  if (!meta.url.startsWith("https://")) {
    return null;
  }
  return { blobUrl: meta.url, pathname: meta.pathname };
}

export async function collectOwnedPhotos(
  userId: string,
  kind: PhotoKind,
  urls: string[],
): Promise<CollectResult> {
  const photos: OwnedPhoto[] = [];
  for (const url of urls) {
    const owned = await ownedBlob(userId, kind, url);
    if (!owned) {
      return { ok: false };
    }
    photos.push(owned);
  }
  return { ok: true, photos };
}

export async function removeBlobs(pathnames: string[]): Promise<void> {
  const targets = pathnames.filter((pathname) => pathname.length > 0);
  if (targets.length === 0) {
    return;
  }
  try {
    await del(targets);
  } catch {
    // A failed blob delete leaves an orphan and does not restore the row.
  }
}
