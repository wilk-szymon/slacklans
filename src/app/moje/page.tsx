import { and, asc, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { event, spot } from "@/lib/schema/spots";
import { getSession } from "@/lib/session";
import { formatWarsaw } from "@/lib/warsaw-time";

export const metadata = {
  title: "Moje sesje — Slacklans",
};

function placeLabel(name: string | null, lat: number, lng: number): string {
  return name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default async function MySessionsPage() {
  await connection();
  const session = await getSession();
  if (!session) {
    redirect("/logowanie?callbackUrl=/moje");
  }

  const rows = await getDb()
    .select({
      id: event.id,
      startsAt: event.startsAt,
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
    })
    .from(event)
    .innerJoin(spot, eq(event.spotId, spot.id))
    .where(
      and(eq(event.creatorId, session.user.id), gt(event.endsAt, new Date())),
    )
    .orderBy(asc(event.startsAt));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Moje sesje</h1>
      {rows.length === 0 ? (
        <p className="mt-8 text-base text-zinc-600 dark:text-zinc-400">
          Nie masz teraz sesji do edycji.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col">
          {rows.map((row) => {
            const place = placeLabel(row.name, row.lat, row.lng);
            const start = formatWarsaw(row.startsAt);
            return (
              <li key={row.id}>
                <Link
                  href={`/sesja/${row.id}/edytuj`}
                  className="flex min-h-12 flex-col justify-center gap-1 py-2 text-base"
                >
                  <span className="font-medium">{place}</span>
                  <span>Start {start}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
