"use client";

import { useActionState } from "react";
import {
  deleteSession,
  updateSession,
  type EditSessionState,
} from "@/lib/spot-actions";

const initialState: EditSessionState = {};

const inputClassName =
  "min-h-12 rounded-lg border border-black/[.08] bg-transparent px-3 text-base dark:border-white/[.145]";

export function EditSessionForm({
  eventId,
  start,
  finish,
}: {
  eventId: string;
  start: string;
  finish: string;
}) {
  const [state, action, pending] = useActionState(updateSession, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSession,
    initialState,
  );

  return (
    <div className="mt-8 flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="flex flex-col gap-2">
          <label htmlFor="start" className="text-sm font-medium">
            Start
          </label>
          <input
            id="start"
            name="start"
            type="datetime-local"
            required
            defaultValue={start}
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
            defaultValue={finish}
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
          disabled={pending}
          className="flex min-h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background disabled:opacity-60"
        >
          {pending ? "Zapisywanie…" : "Zapisz zmiany"}
        </button>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="eventId" value={eventId} />
        {deleteState?.error ? (
          <p role="alert" aria-live="polite" className="mb-3 text-sm text-red-600">
            {deleteState.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={deletePending}
          className="flex min-h-12 items-center text-base font-medium underline disabled:opacity-60"
        >
          {deletePending ? "Usuwanie…" : "Usuń sesję"}
        </button>
      </form>
    </div>
  );
}
