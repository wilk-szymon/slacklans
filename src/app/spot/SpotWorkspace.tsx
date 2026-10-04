"use client";

import { useState } from "react";
import { SpotMapLoader } from "@/components/SpotMapLoader";
import type { SpotPin } from "@/lib/spot-pin";
import { SpotForm } from "./SpotForm";

export function SpotWorkspace({
  spots,
  maptilerKey,
  currentUserId,
}: {
  spots: SpotPin[];
  maptilerKey: string;
  currentUserId: string;
}) {
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [newLatLng, setNewLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  return (
    <>
      <SpotMapLoader
        maptilerKey={maptilerKey}
        spots={spots}
        selectedSpotId={selectedSpotId}
        newLatLng={newLatLng}
        onSelectSpot={(id) => {
          setSelectedSpotId(id);
          setNewLatLng(null);
        }}
        onSelectNew={(lat, lng) => {
          setSelectedSpotId(null);
          setNewLatLng({ lat, lng });
        }}
      />
      <SpotForm
        spots={spots}
        selectedSpotId={selectedSpotId}
        newLatLng={newLatLng}
        currentUserId={currentUserId}
      />
    </>
  );
}
