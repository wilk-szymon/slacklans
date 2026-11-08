"use client";

import { PhotoUploadField } from "@/components/PhotoUploadField";
import { addSessionPhoto } from "@/lib/photo-actions";

export function SessionPhotoUpload({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  return (
    <PhotoUploadField
      inputId="session-photo"
      label="Dodaj zdjęcie"
      kind="session"
      userId={userId}
      attach={(url) => addSessionPhoto(eventId, url)}
    />
  );
}
