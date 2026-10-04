export const PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export type PhotoKind = "session" | "spot";

export type UploadTokenOptions = {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
  addRandomSuffix: true;
  tokenPayload: string;
};

export function photoPathPrefix(kind: PhotoKind, userId: string): string {
  const root = kind === "session" ? "session-photos" : "spot-photos";
  return `${root}/${userId}/`;
}

export function parseUploadKind(clientPayload: string | null): PhotoKind | null {
  if (!clientPayload) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(clientPayload);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const kind = (parsed as { kind?: unknown }).kind;
    if (kind === "session" || kind === "spot") {
      return kind;
    }
  } catch {
    return null;
  }
  return null;
}

function isSafeUserId(userId: string): boolean {
  return (
    userId.length > 0 &&
    !userId.includes("/") &&
    !userId.includes("\\") &&
    !userId.includes("..") &&
    !userId.includes("\0")
  );
}

export function isAllowedPhotoPath(
  kind: PhotoKind,
  userId: string,
  pathname: string,
): boolean {
  if (!isSafeUserId(userId)) {
    return false;
  }
  if (
    pathname.includes("..") ||
    pathname.includes("\\") ||
    pathname.includes("\0")
  ) {
    return false;
  }
  return pathname.startsWith(photoPathPrefix(kind, userId));
}

export function isPhotoContentType(value: string): value is PhotoContentType {
  return (PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * Token options for a browser upload.
 * Do not return `pathname`: the SDK overwrites it. The browser must send a
 * pathname that already starts with this user's prefix.
 */
export function authorizeUpload(
  userId: string | null,
  kind: PhotoKind | null,
  pathname: string,
): { ok: true; options: UploadTokenOptions } | { ok: false } {
  if (!userId || !kind || !isAllowedPhotoPath(kind, userId, pathname)) {
    return { ok: false };
  }
  return {
    ok: true,
    options: {
      allowedContentTypes: [...PHOTO_CONTENT_TYPES],
      maximumSizeInBytes: MAX_PHOTO_BYTES,
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({ userId, kind }),
    },
  };
}
