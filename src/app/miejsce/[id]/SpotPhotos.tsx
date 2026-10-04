import { loadChromeSession } from "@/lib/chrome-session";
import {
  deleteSpotPhotoFromForm,
  featureSessionPhotoFromForm,
  unfeatureSessionPhotoFromForm,
} from "@/lib/photo-actions";
import {
  loadSpotGallery,
  loadUnfeaturedSessionPhotos,
} from "@/lib/photo-queries";
import { SpotPhotoUpload } from "./SpotPhotoUpload";

const buttonClassName =
  "mt-2 flex min-h-12 items-center rounded-full border border-black/[.08] px-4 text-base font-medium dark:border-white/[.145]";

export async function SpotPhotos({
  spotId,
  creatorId,
}: {
  spotId: string;
  creatorId: string;
}) {
  const [session, photos] = await Promise.all([
    loadChromeSession(),
    loadSpotGallery(spotId),
  ]);
  const userId = session?.user?.id ?? null;
  const isOwner = userId !== null && userId === creatorId;
  const unfeatured = isOwner ? await loadUnfeaturedSessionPhotos(spotId) : [];

  if (photos.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {photos.length > 0 ? (
        <section aria-labelledby="spot-photos">
          <h2
            id="spot-photos"
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
          >
            Zdjęcia
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {photos.map((photo) => (
              <li key={`${photo.kind}-${photo.id}`}>
                {/* Plain img: these photos skip Next image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.blobUrl} alt="Zdjęcie" className="w-full" />
                {isOwner && photo.kind === "spot" ? (
                  <form action={deleteSpotPhotoFromForm.bind(null, photo.id)}>
                    <button type="submit" className={buttonClassName}>
                      Usuń zdjęcie
                    </button>
                  </form>
                ) : null}
                {isOwner && photo.kind === "session" ? (
                  <form action={unfeatureSessionPhotoFromForm.bind(null, photo.id)}>
                    <button type="submit" className={buttonClassName}>
                      Usuń ze strony miejsca
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {isOwner && userId ? (
        <SpotPhotoUpload spotId={spotId} userId={userId} />
      ) : null}
      {isOwner && unfeatured.length > 0 ? (
        <section aria-labelledby="spot-session-photos">
          <h2
            id="spot-session-photos"
            className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
          >
            Zdjęcia z sesji
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {unfeatured.map((photo) => (
              <li key={photo.id}>
                {/* Plain img: these photos skip Next image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.blobUrl} alt="Zdjęcie" className="w-full" />
                <form action={featureSessionPhotoFromForm.bind(null, photo.id)}>
                  <button type="submit" className={buttonClassName}>
                    Pokaż na stronie miejsca
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
