import { loadChromeSession } from "@/lib/chrome-session";
import { deleteSessionPhotoFromForm } from "@/lib/photo-actions";
import { loadSessionPhotos } from "@/lib/photo-queries";
import { SessionPhotoUpload } from "./SessionPhotoUpload";

const buttonClassName =
  "mt-2 flex min-h-12 items-center rounded-full border border-black/[.08] px-4 text-base font-medium dark:border-white/[.145]";

export async function SessionPhotos({ eventId }: { eventId: string }) {
  const [session, photos] = await Promise.all([
    loadChromeSession(),
    loadSessionPhotos(eventId),
  ]);
  const userId = session?.user?.id ?? null;

  if (photos.length === 0 && !userId) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {photos.length > 0 ? (
        <section aria-labelledby="session-photos">
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
                {userId && photo.uploaderId === userId ? (
                  <form action={deleteSessionPhotoFromForm.bind(null, photo.id)}>
                    <button type="submit" className={buttonClassName}>
                      Usuń zdjęcie
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {userId ? (
        <SessionPhotoUpload eventId={eventId} userId={userId} />
      ) : null}
    </div>
  );
}
