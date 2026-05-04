"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getDictionary } from "@/i18n";

const iconStart = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconCurrent = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconDest = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconEvent = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const iconPhoto = L.divIcon({
  html: `<div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid #8b5cf6; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const iconNote = L.divIcon({
  html: `<div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid #f97316; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function Recenter({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function MapRotator({ heading, isAutoRotate }: { heading?: number | null, isAutoRotate: boolean }) {
  const map = useMap();
  useEffect(() => {
    const pane = map.getPane('mapPane');
    if (pane) {
      if (isAutoRotate && heading !== undefined && heading !== null) {
        pane.style.transform = `rotate(${-heading}deg)`;
        pane.style.transformOrigin = "center center";
        pane.style.transition = "transform 0.5s ease-out";
      } else {
        pane.style.transform = "";
      }
    }
  }, [heading, isAutoRotate, map]);
  return null;
}

interface LiveMapProps {
  currentLocation: { lat: number; lng: number; heading?: number | null };
  pathTraveled: { lat: number; lng: number }[];
  destination: { lat: number; lng: number } | null;
  onRouteDistance?: (distanceKm: number) => void;
  events?: { lat: number; lng: number, label: string, id: string, photoUrl?: string, note?: string, type?: 'photo' | 'note' | 'default' }[];
  onEventClick?: (id: string) => void;
}

export default function LiveMap({ currentLocation, pathTraveled, destination, onRouteDistance, events = [], onEventClick }: LiveMapProps) {
  const [routeToDest, setRouteToDest] = useState<[number, number][]>([]);
  const [isAutoRotate, setIsAutoRotate] = useState(false);
  const dict = getDictionary().admin.map;

  // OSRM Routing
  useEffect(() => {
    if (currentLocation && destination) {
      const fetchRoute = async () => {
        try {
          // OSRM expects: lng,lat;lng,lat
          const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.lng},${currentLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            // GeoJSON returns [lng, lat]
            const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
            setRouteToDest(coordinates);
            
            if (onRouteDistance) {
              onRouteDistance(route.distance / 1000); // meters to km
            }
          }
        } catch (e) {
          console.error("OSRM Routing failed", e);
        }
      };
      fetchRoute();
    }
  }, [currentLocation.lat, currentLocation.lng, destination?.lat, destination?.lng]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-800 relative">
      {currentLocation.heading !== undefined && currentLocation.heading !== null && (
        <button
          onClick={() => setIsAutoRotate(!isAutoRotate)}
          className="absolute bottom-6 right-4 z-[1000] bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white px-4 py-2 rounded-full shadow-lg font-medium text-xs border border-zinc-200 dark:border-zinc-700 transition active:scale-95"
        >
          {isAutoRotate ? dict.rotateOn : dict.navigateRotate}
        </button>
      )}

      <MapContainer center={[currentLocation.lat, currentLocation.lng]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* Traveled Path */}
        {pathTraveled.length > 0 && (
           <Polyline positions={pathTraveled.map(p => [p.lat, p.lng])} color="#3b82f6" weight={5} opacity={0.7} />
        )}

        {/* Start Point */}
        {pathTraveled.length > 0 && (
           <Marker position={[pathTraveled[0].lat, pathTraveled[0].lng]} icon={iconStart}>
             <Popup>{dict.startPoint}</Popup>
           </Marker>
        )}

        {/* Route to Dest */}
        {routeToDest.length > 0 && (
           <Polyline positions={routeToDest} color="#ef4444" weight={4} dashArray="5, 10" opacity={0.8} />
        )}

        {/* Destination Point */}
        {events.map((ev, i) => (
             <Marker 
              key={ev.id || i} 
              position={[ev.lat, ev.lng]} 
              icon={ev.type === 'photo' ? iconPhoto : (ev.type === 'note' ? iconNote : iconEvent)}
              eventHandlers={{
               click: () => onEventClick && onEventClick(ev.id)
             }}
           >
             <Popup>
                <div className="flex flex-col gap-2 min-w-[150px] max-w-[250px]">
                  <p className="font-semibold m-0">{ev.label}</p>
                  {ev.note && <p className="text-sm italic m-0 break-words">{ev.note}</p>}
                  {ev.photoUrl && <img src={ev.photoUrl} alt="Zdarzenie" className="w-full rounded-md object-cover max-h-[150px]" />}
                </div>
             </Popup>
           </Marker>
        ))}

        {destination && (
           <Marker position={[destination.lat, destination.lng]} icon={iconDest}>
             <Popup>{dict.destination}</Popup>
           </Marker>
        )}

        {/* Current Location */}
        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={iconCurrent}>
           <Popup>{dict.currentLocation}</Popup>
        </Marker>
        <Recenter lat={currentLocation.lat} lng={currentLocation.lng} />
        <MapRotator heading={currentLocation.heading} isAutoRotate={isAutoRotate} />
      </MapContainer>
    </div>
  );
}
