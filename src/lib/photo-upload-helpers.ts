import type { PhotoKind } from "@/lib/blob-upload";
import { parseWarsawLocal } from "@/lib/warsaw-time";

// Same copy as TIME_ORDER in spot-actions.ts (server stays the source of truth).
const FINISH_AFTER_START = "Zakończenie musi być później niż start.";

export function photoCacheKey(kind: PhotoKind, file: File): string {
  return [kind, file.name, file.size, file.lastModified].join("|");
}

export function partialSaveMessage(
  saved: number,
  total: number,
  error: string,
): string {
  return saved > 0 ? `Zapisano ${saved} z ${total} zdjęć. ${error}` : error;
}

export function finishAfterStartError(
  startRaw: string,
  finishRaw: string,
): string | null {
  const start = parseWarsawLocal(startRaw);
  const finish = parseWarsawLocal(finishRaw);
  if (!start || !finish) {
    return null;
  }
  return finish.getTime() <= start.getTime() ? FINISH_AFTER_START : null;
}
