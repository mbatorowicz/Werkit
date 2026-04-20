"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Ominięcie SSR dla map Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export default function LiveMap() {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamiczny import zasobów CSS
    import("leaflet/dist/leaflet.css");
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  if (!mounted || !L) {
    return (
      <div className="w-full h-full flex justify-center items-center bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
          <p className="text-zinc-500 text-xs font-medium">Inicjalizacja mapy przestrzennej...</p>
        </div>
      </div>
    );
  }

  // Tworzymy spersonalizowaną ikonę radaru na mapę z efektem świecenia HTML w Tailwindzie
  const customIcon = L.divIcon({
    className: "bg-transparent",
    html: `<div class="relative w-4 h-4">
             <div class="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
             <div class="absolute inset-0 bg-blue-400 rounded-full border border-blue-200"></div>
           </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  // Środek w przybliżeniu (Polska/Mazowsze)
  const position: [number, number] = [52.2297, 21.0122];

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={position} 
        zoom={6} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", backgroundColor: '#0a0a0b' }}
        zoomControl={false}
      >
        {/* Głęboki tryb ciemny do OSM z cartodb (dark matter) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={position} icon={customIcon}>
          <Popup className="werkit-popup">
            <div className="text-sm font-medium text-zinc-900">Baza Główna (Warsztat)</div>
            <div className="text-xs text-zinc-500">Status: Aktywny</div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
