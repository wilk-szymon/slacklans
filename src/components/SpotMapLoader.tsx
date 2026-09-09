"use client";

import dynamic from "next/dynamic";
import type { SpotMapProps } from "./SpotMap";

const SpotMap = dynamic(() => import("./SpotMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(70dvh,32rem)] min-h-48 items-center justify-center text-base text-zinc-600 dark:text-zinc-400">
      Wczytywanie mapy…
    </div>
  ),
});

export function SpotMapLoader({ maptilerKey, ...props }: SpotMapProps) {
  if (!maptilerKey) {
    return (
      <p role="alert" className="text-base text-red-600">
        Nie można wczytać mapy. Brak klucza MapTiler.
      </p>
    );
  }

  return <SpotMap maptilerKey={maptilerKey} {...props} />;
}
