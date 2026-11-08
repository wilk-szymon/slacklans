"use client";

import { useRef, useState } from "react";
import { photoListError, type PhotoKind } from "@/lib/blob-upload";
import type { PhotoActionState } from "@/lib/photo-actions";
import { partialSaveMessage } from "@/lib/photo-upload-helpers";
import { shownUploadError, uploadClientPhoto } from "@/lib/upload-client-photo";

const inputClassName =
  "block w-full min-h-12 rounded-lg border border-black/[.08] bg-transparent px-3 py-2 text-base dark:border-white/[.145]";

export function PhotoUploadField({
  inputId,
  label,
  kind,
  userId,
  attach,
}: {
  inputId: string;
  label: string;
  kind: PhotoKind;
  userId: string;
  attach: (url: string) => Promise<PhotoActionState>;
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
    let saved = 0;
    try {
      for (const file of files) {
        const url = await uploadClientPhoto(userId, kind, file);
        const result = await attach(url);
        if (result.error) {
          setError(partialSaveMessage(saved, files.length, result.error));
          return;
        }
        saved += 1;
      }
    } catch (caught) {
      setError(
        partialSaveMessage(saved, files.length, shownUploadError(caught)),
      );
    } finally {
      if (input) {
        input.value = "";
      }
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
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
