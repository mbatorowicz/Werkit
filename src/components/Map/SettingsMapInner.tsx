"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

const customIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div style="background-color: #f59e0b; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 12px rgba(245, 158, 11, 0.9);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

interface SettingsMapInnerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function SettingsMapInner({ lat, lng, onLocationChange }: SettingsMapInnerProps) {
  return (
    <MapContainer 
      center={[lat, lng]} 
      zoom={14} 
      style={{ width: "100%", height: "100%", zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap &copy; CartoDB"
      />
      <MapUpdater center={[lat, lng]} />
      <MapEvents onLocationSelect={onLocationChange} />
      <Marker position={[lat, lng]} icon={customIcon} />
    </MapContainer>
  );
}
