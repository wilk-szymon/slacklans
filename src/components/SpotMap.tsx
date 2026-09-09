"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { SpotPin } from "@/lib/spot-pin";
import "leaflet/dist/leaflet.css";

const GDYNIA: [number, number] = [54.52, 18.53];

const ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

function imageSrc(image: string | { src: string }) {
  return typeof image === "string" ? image : image.src;
}

const iconOptions = {
  iconRetinaUrl: imageSrc(iconRetinaUrl),
  iconUrl: imageSrc(iconUrl),
  shadowUrl: imageSrc(shadowUrl),
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  tooltipAnchor: [16, -28] as [number, number],
  shadowSize: [41, 41] as [number, number],
};

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions(iconOptions);

const defaultIcon = new L.Icon(iconOptions);
const selectedIcon = new L.Icon({
  ...iconOptions,
  className: "spot-marker-selected",
});

function isMarkerClick(event: L.LeafletMouseEvent) {
  const target = event.originalEvent.target;
  return (
    target instanceof Element &&
    Boolean(target.closest(".leaflet-marker-icon, .leaflet-marker-shadow"))
  );
}

function MapBackgroundClick({
  onSelectNew,
}: {
  onSelectNew: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (isMarkerClick(event)) {
        return;
      }
      onSelectNew(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export type SpotMapProps = {
  maptilerKey: string;
  spots: SpotPin[];
  selectedSpotId: string | null;
  newLatLng: { lat: number; lng: number } | null;
  onSelectSpot: (id: string) => void;
  onSelectNew: (lat: number, lng: number) => void;
};

export default function SpotMap({
  maptilerKey,
  spots,
  selectedSpotId,
  newLatLng,
  onSelectSpot,
  onSelectNew,
}: SpotMapProps) {
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
        <MapBackgroundClick onSelectNew={onSelectNew} />
        {spots.map((pin) => {
          const selected = pin.id === selectedSpotId;
          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={selected ? selectedIcon : defaultIcon}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{
                click: (event) => {
                  L.DomEvent.stopPropagation(event.originalEvent);
                  onSelectSpot(pin.id);
                },
              }}
            />
          );
        })}
        {newLatLng ? (
          <Marker
            position={[newLatLng.lat, newLatLng.lng]}
            icon={selectedIcon}
            zIndexOffset={1000}
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stopPropagation(event.originalEvent);
              },
            }}
          />
        ) : null}
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
