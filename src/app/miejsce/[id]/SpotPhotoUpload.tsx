"use client";

import { PhotoUploadField } from "@/components/PhotoUploadField";
import { addSpotPhoto } from "@/lib/photo-actions";

export function SpotPhotoUpload({
  spotId,
  userId,
}: {
  spotId: string;
  userId: string;
}) {
  return (
    <PhotoUploadField
      inputId="spot-photo"
      label="Dodaj zdjęcie miejsca"
      kind="spot"
      userId={userId}
      attach={(url) => addSpotPhoto(spotId, url)}
    />
  );
}
