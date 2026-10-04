import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loadSpotGallery } from "@/lib/photo-queries";
import { spot } from "@/lib/schema/spots";

const loadPublicSpot = cache(async (id: string) => {
  const [row] = await getDb()
    .select({
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
    })
    .from(spot)
    .where(eq(spot.id, id))
    .limit(1);
  return row ?? null;
});

function spotTitle(name: string | null): string {
  return name ? `${name} — Miejsce — Slacklans` : "Miejsce — Slacklans";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await loadPublicSpot(id);
  return { title: spotTitle(row?.name ?? null) };
}

export default async function MiejscePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await loadPublicSpot(id);
  if (!row) {
    notFound();
  }

  const place = row.name ?? `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}`;
  const mapHref = `https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lng}#map=17/${row.lat}/${row.lng}`;
  const photos = await loadSpotGallery(id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{place}</h1>
      <a
        href={mapHref}
        className="mt-8 flex min-h-12 items-center text-base font-medium underline"
        target="_blank"
        rel="noreferrer"
      >
        Otwórz na mapie
      </a>
      {photos.length > 0 ? (
        <section className="mt-8" aria-labelledby="spot-photos">
          <h2
            id="spot-photos"
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
