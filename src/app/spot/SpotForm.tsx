"use client";

import { useActionState } from "react";
import {
  createSession,
  type CreateSessionState,
} from "@/lib/spot-actions";
import type { SpotPin } from "@/lib/spot-pin";

const initialState: CreateSessionState = {};

const inputClassName =
  "min-h-12 rounded-lg border border-black/[.08] bg-transparent px-3 text-base dark:border-white/[.145]";

export function SpotForm({
  spots,
  selectedSpotId,
  newLatLng,
}: {
  spots: SpotPin[];
  selectedSpotId: string | null;
  newLatLng: { lat: number; lng: number } | null;
}) {
  const [state, action, pending] = useActionState(createSession, initialState);
  const selectedSpot = spots.find((item) => item.id === selectedSpotId) ?? null;
  const hasPlace = Boolean(selectedSpot || newLatLng);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
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

      {state?.error ? (
        <p role="alert" aria-live="polite" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !hasPlace}
        className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background disabled:opacity-60"
      >
        {pending ? "Zapisywanie…" : "Opublikuj sesję"}
      </button>
    </form>
  );
}
