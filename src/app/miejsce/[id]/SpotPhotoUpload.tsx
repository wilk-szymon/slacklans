"use client";

import { useRef, useState } from "react";
import { photoListError } from "@/lib/blob-upload";
import { addSpotPhoto } from "@/lib/photo-actions";
import { shownUploadError, uploadClientPhoto } from "@/lib/upload-client-photo";

const inputClassName =
  "block w-full min-h-12 rounded-lg border border-black/[.08] bg-transparent px-3 py-2 text-base dark:border-white/[.145]";

export function SpotPhotoUpload({
  spotId,
  userId,
}: {
  spotId: string;
  userId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onChange() {
    const input = inputRef.current;
    const files = input?.files ? [...input.files] : [];
    if (files.length === 0 || lock.current) {
      return;
    }
    const problem = photoListError(files);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    lock.current = true;
    setPending(true);
    try {
      for (const file of files) {
        const url = await uploadClientPhoto(userId, "spot", file);
        const result = await addSpotPhoto(spotId, url);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      if (input) {
        input.value = "";
      }
    } catch (caught) {
      setError(shownUploadError(caught));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="spot-photo" className="text-sm font-medium">
        Dodaj zdjęcie miejsca
      </label>
      <input
        id="spot-photo"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={pending}
        onChange={() => {
          void onChange();
        }}
        className={inputClassName}
      />
      {pending ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Wysyłanie…</p>
      ) : null}
      {error ? (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
