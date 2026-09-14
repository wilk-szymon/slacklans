import { connection } from "next/server";
import Link from "next/link";
import {
  loadHomeSessions,
  type HomeSession,
} from "@/lib/home-sessions";
import { formatWarsaw } from "@/lib/warsaw-time";

export const dynamic = "force-dynamic";

function placeLabel(session: HomeSession): string {
  return session.name ?? `${session.lat.toFixed(5)}, ${session.lng.toFixed(5)}`;
}

function SessionCard({
  session,
  showFinish,
}: {
  session: HomeSession;
  showFinish: boolean;
}) {
  const place = placeLabel(session);
  const start = formatWarsaw(session.startsAt);

  return (
    <Link
      href={`/sesja/${session.id}`}
      className="flex min-h-12 flex-col justify-center gap-1 py-2 text-base"
    >
      <span className="font-medium">{place}</span>
      <span>
        Start {start}
        {showFinish ? ` · Koniec ${formatWarsaw(session.endsAt)}` : ""}
      </span>
    </Link>
  );
}

export default async function Home() {
  await connection();
  const { hero, rest } = await loadHomeSessions(new Date());

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Slacklans</h1>
      {hero ? (
        <>
          <section className="mt-8" aria-labelledby="nearest-session">
            <h2
              id="nearest-session"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
            >
              Najbliższa sesja
            </h2>
            <div className="mt-2">
              <SessionCard session={hero} showFinish />
            </div>
          </section>
          {rest.length > 0 ? (
            <section className="mt-8" aria-labelledby="later-sessions">
              <h2
                id="later-sessions"
                className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
              >
                Kolejne sesje
              </h2>
              <ul className="mt-2">
                {rest.map((session) => (
                  <li key={session.id}>
                    <SessionCard session={session} showFinish={false} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className="mt-8 text-base text-zinc-600 dark:text-zinc-400">
          Nie ma teraz sesji do dołączenia.
        </p>
      )}
    </main>
  );
}
