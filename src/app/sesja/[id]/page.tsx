import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loadSessionPhotos } from "@/lib/photo-queries";
import { event, spot } from "@/lib/schema/spots";
import { formatWarsaw } from "@/lib/warsaw-time";

const loadPublicSession = cache(async (id: string) => {
  const [row] = await getDb()
    .select({
      spotId: spot.id,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
    })
    .from(event)
    .innerJoin(spot, eq(event.spotId, spot.id))
    .where(eq(event.id, id))
    .limit(1);
  return row ?? null;
});

function sessionTitle(name: string | null): string {
  return name ? `${name} — Sesja — Slacklans` : "Sesja — Slacklans";
}

export async function generateMetadata({
  params,
}: PageProps<"/sesja/[id]">): Promise<Metadata> {
  const { id } = await params;
  const row = await loadPublicSession(id);
  return { title: sessionTitle(row?.name ?? null) };
}

export default async function SesjaPage({
  params,
}: PageProps<"/sesja/[id]">) {
  const { id } = await params;
  const row = await loadPublicSession(id);
  if (!row) {
    notFound();
  }

  const place = row.name ?? `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}`;
  const mapHref = `https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lng}#map=17/${row.lat}/${row.lng}`;
  const photos = await loadSessionPhotos(id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sesja</h1>
      <dl className="mt-8 flex flex-col gap-5 text-base">
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Start
          </dt>
          <dd className="mt-1">{formatWarsaw(row.startsAt)}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Koniec
          </dt>
          <dd className="mt-1">{formatWarsaw(row.endsAt)}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Miejsce
          </dt>
          <dd className="mt-1">
            <Link
              href={`/miejsce/${row.spotId}`}
              className="inline-flex min-h-12 items-center underline"
            >
              {place}
            </Link>
          </dd>
        </div>
      </dl>
      <a
        href={mapHref}
        className="mt-8 flex min-h-12 items-center text-base font-medium underline"
        target="_blank"
        rel="noreferrer"
      >
        Otwórz na mapie
      </a>
      {photos.length > 0 ? (
        <section className="mt-8" aria-labelledby="session-photos">
          <h2
            id="session-photos"
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
          >
            Zdjęcia
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {photos.map((photo) => (
              <li key={photo.id}>
                {/* Plain img: these photos skip Next image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.blobUrl} alt="Zdjęcie" className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
