import { upload } from "@vercel/blob/client";
import {
  PHOTO_SAVE_ERROR,
  PHOTO_SIZE_ERROR,
  PHOTO_TYPE_ERROR,
  photoFileError,
  photoUploadPathname,
  resolvedPhotoType,
  type PhotoKind,
} from "@/lib/blob-upload";

const KNOWN_UPLOAD_ERRORS = new Set([
  PHOTO_SAVE_ERROR,
  PHOTO_SIZE_ERROR,
  PHOTO_TYPE_ERROR,
]);

export function shownUploadError(error: unknown): string {
  if (error instanceof Error && KNOWN_UPLOAD_ERRORS.has(error.message)) {
    return error.message;
  }
  return PHOTO_SAVE_ERROR;
}

export async function uploadClientPhoto(
  userId: string,
  kind: PhotoKind,
  file: File,
): Promise<string> {
  const problem = photoFileError(file);
  if (problem) {
    throw new Error(problem);
  }
  const contentType = resolvedPhotoType(file);
  if (!contentType) {
    throw new Error(PHOTO_TYPE_ERROR);
  }
  const blob = await upload(photoUploadPathname(kind, userId, file.name), file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    clientPayload: JSON.stringify({ kind }),
    contentType,
  });
  if (!blob.url.startsWith("https://")) {
    throw new Error(PHOTO_SAVE_ERROR);
  }
  return blob.url;
}
