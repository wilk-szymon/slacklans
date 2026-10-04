"use client";

import {
  useActionState,
  useRef,
  useState,
  startTransition,
  type FormEvent,
} from "react";
import { photoListError } from "@/lib/blob-upload";
import type { SpotPin } from "@/lib/spot-pin";
import {
  createSession,
  type CreateSessionState,
} from "@/lib/spot-actions";
import { shownUploadError, uploadClientPhoto } from "@/lib/upload-client-photo";

const initialState: CreateSessionState = {};

const inputClassName =
  "min-h-12 rounded-lg border border-black/[.08] bg-transparent px-3 text-base dark:border-white/[.145]";

function selectedFiles(input: HTMLInputElement | null): File[] {
  return input?.files ? [...input.files] : [];
}

export function SpotForm({
  spots,
  selectedSpotId,
  newLatLng,
  currentUserId,
}: {
  spots: SpotPin[];
  selectedSpotId: string | null;
  newLatLng: { lat: number; lng: number } | null;
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState(createSession, initialState);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const sessionInput = useRef<HTMLInputElement>(null);
  const spotInput = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);
  const selectedSpot = spots.find((item) => item.id === selectedSpotId) ?? null;
  const hasPlace = Boolean(selectedSpot || newLatLng);
  const canAddSpotPhotos = Boolean(
    newLatLng || (selectedSpot && selectedSpot.creatorId === currentUserId),
  );
  const busy = pending || uploading;
  const error = uploadError ?? state?.error;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitLock.current) {
      return;
    }
    submitLock.current = true;
    const form = event.currentTarget;
    setUploadError(null);
    const sessionFiles = selectedFiles(sessionInput.current);
    const spotFiles = canAddSpotPhotos ? selectedFiles(spotInput.current) : [];
    const problem = photoListError([...sessionFiles, ...spotFiles]);
    if (problem) {
      submitLock.current = false;
      setUploadError(problem);
      return;
    }

    setUploading(true);
    try {
      const sessionUrls: string[] = [];
      for (const file of sessionFiles) {
        sessionUrls.push(
          await uploadClientPhoto(currentUserId, "session", file),
        );
      }
      const spotUrls: string[] = [];
      for (const file of spotFiles) {
        spotUrls.push(await uploadClientPhoto(currentUserId, "spot", file));
      }
      const data = new FormData(form);
      for (const url of sessionUrls) {
        data.append("sessionPhotoUrl", url);
      }
      for (const url of spotUrls) {
        data.append("spotPhotoUrl", url);
      }
      startTransition(() => {
        action(data);
      });
    } catch (caught) {
      setUploadError(shownUploadError(caught));
    } finally {
      submitLock.current = false;
      setUploading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
      {selectedSpot ? (
        <input type="hidden" name="spotId" value={selectedSpot.id} />
      ) : null}
      {newLatLng ? (
        <>
          <input type="hidden" name="lat" value={String(newLatLng.lat)} />
          <input type="hidden" name="lng" value={String(newLatLng.lng)} />
        </>
      ) : null}

      <p className="text-base text-zinc-600 dark:text-zinc-400">
        {selectedSpot
          ? `Wybrany spot: ${selectedSpot.name ?? `${selectedSpot.lat.toFixed(5)}, ${selectedSpot.lng.toFixed(5)}`}`
          : newLatLng
            ? `Nowe miejsce: ${newLatLng.lat.toFixed(5)}, ${newLatLng.lng.toFixed(5)}`
            : "Kliknij pinezkę albo puste miejsce na mapie."}
      </p>

      {newLatLng ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Nazwa (opcjonalnie)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            maxLength={200}
            autoComplete="off"
            className={inputClassName}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="start" className="text-sm font-medium">
          Start
        </label>
        <input
          id="start"
          name="start"
          type="datetime-local"
          required
          className={inputClassName}
          onInvalid={(event) => {
            event.currentTarget.setCustomValidity("Podaj czas rozpoczęcia.");
          }}
          onInput={(event) => {
            event.currentTarget.setCustomValidity("");
          }}
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Czas lokalny (Warszawa)
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="finish" className="text-sm font-medium">
          Koniec
        </label>
        <input
          id="finish"
          name="finish"
          type="datetime-local"
          required
          className={inputClassName}
          onInvalid={(event) => {
            event.currentTarget.setCustomValidity("Podaj czas zakończenia.");
          }}
          onInput={(event) => {
            event.currentTarget.setCustomValidity("");
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="publish-session-photo" className="text-sm font-medium">
          Dodaj zdjęcie
        </label>
        <input
          id="publish-session-photo"
          ref={sessionInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          className={inputClassName}
        />
      </div>

      {canAddSpotPhotos ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="publish-spot-photo" className="text-sm font-medium">
            Dodaj zdjęcie miejsca
          </label>
          <input
            id="publish-spot-photo"
            ref={spotInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            className={inputClassName}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || !hasPlace}
        className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background disabled:opacity-60"
      >
        {uploading ? "Wysyłanie…" : pending ? "Zapisywanie…" : "Opublikuj sesję"}
      </button>
    </form>
  );
}
