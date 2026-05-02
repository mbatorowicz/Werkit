"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function Recenter({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

interface LiveMapProps {
  currentLocation: { lat: number; lng: number };
  pathTraveled: { lat: number; lng: number }[];
  destination: { lat: number; lng: number } | null;
  onRouteDistance?: (distanceKm: number) => void;
}

export default function LiveMap({ currentLocation, pathTraveled, destination, onRouteDistance }: LiveMapProps) {
  const [routeToDest, setRouteToDest] = useState<[number, number][]>([]);

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
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800">
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
             <Popup>Punkt Startowy</Popup>
           </Marker>
        )}

        {/* Route to Dest */}
        {routeToDest.length > 0 && (
           <Polyline positions={routeToDest} color="#ef4444" weight={4} dashArray="5, 10" opacity={0.8} />
        )}

        {/* Destination Point */}
        {destination && (
           <Marker position={[destination.lat, destination.lng]} icon={iconDest}>
             <Popup>Cel</Popup>
           </Marker>
        )}

        {/* Current Location */}
        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={iconCurrent}>
           <Popup>Aktualna pozycja</Popup>
        </Marker>
        <Recenter lat={currentLocation.lat} lng={currentLocation.lng} />
      </MapContainer>
    </div>
  );
}
