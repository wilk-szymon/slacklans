"use client";

import L from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

const GDYNIA: [number, number] = [54.52, 18.53];

const ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

function imageSrc(image: string | { src: string }) {
  return typeof image === "string" ? image : image.src;
}

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: imageSrc(iconRetinaUrl),
  iconUrl: imageSrc(iconUrl),
  shadowUrl: imageSrc(shadowUrl),
});

export default function SpotMap({ maptilerKey }: { maptilerKey: string }) {
  const tileUrl = `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=${maptilerKey}`;

  return (
    <div className="relative h-[min(70dvh,32rem)] min-h-48 w-full overflow-hidden rounded-lg">
      <MapContainer
        center={GDYNIA}
        zoom={13}
        className="z-0 h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url={tileUrl}
          attribution={ATTRIBUTION}
          tileSize={512}
          zoomOffset={-1}
          minZoom={1}
          crossOrigin
        />
      </MapContainer>
      <a
        href="https://www.maptiler.com"
        className="absolute bottom-2 left-2 z-[1000]"
        target="_blank"
        rel="noreferrer"
      >
        {/* MapTiler Free plan requires the logo; next/image is reserved for S-02 uploads. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://api.maptiler.com/resources/logo.svg"
          alt="MapTiler logo"
          width={80}
          height={24}
        />
      </a>
    </div>
  );
}
