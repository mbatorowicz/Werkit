"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const iconLocation = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface CustomerMapPickerProps {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
}

function LocationMarker({ lat, lng, onChange }: CustomerMapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    lat && lng ? [parseFloat(lat), parseFloat(lng)] : null
  );

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      onChange(e.latlng.lat.toString(), e.latlng.lng.toString());
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={iconLocation} />
  );
}

export default function CustomerMapPicker({ lat, lng, onChange }: CustomerMapPickerProps) {
  const center: [number, number] = lat && lng ? [parseFloat(lat), parseFloat(lng)] : [52.2297, 21.0122];

  return (
    <div className="w-full h-[250px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative z-0">
      <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <LocationMarker lat={lat} lng={lng} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
