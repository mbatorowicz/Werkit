"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getDictionary } from "@/i18n";

const iconLocation = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface CustomerMapPickerProps {
  lat: string;
  lng: string;
  /** Adres wpisany w formularzu — używany do przycisku „Pokaż na mapie”. */
  address: string;
  onChange: (lat: string, lng: string) => void;
}

function FlyToCoordinates({ latSig }: { latSig: string }) {
  const map = useMap();

  useEffect(() => {
    if (!latSig) return;
    const [laS, lgS] = latSig.split(",");
    const la = Number.parseFloat(laS);
    const lg = Number.parseFloat(lgS);
    if (Number.isNaN(la) || Number.isNaN(lg)) return;
    map.flyTo([la, lg], 17, { duration: 0.65 });
  }, [latSig, map]);

  return null;
}

function MapPinLayer({
  lat,
  lng,
  onPick,
}: {
  lat: string;
  lng: string;
  onPick: (la: number, lg: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  const la = Number.parseFloat(lat);
  const lg = Number.parseFloat(lng);
  const hasPin = !Number.isNaN(la) && !Number.isNaN(lg);

  if (!hasPin) return null;

  return (
    <Marker
      position={[la, lg]}
      icon={iconLocation}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const p = e.target.getLatLng();
          onPick(p.lat, p.lng);
        },
      }}
    />
  );
}

export default function CustomerMapPicker({ lat, lng, address, onChange }: CustomerMapPickerProps) {
  const dict = getDictionary().admin.customers;
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<string | null>(null);

  const center: [number, number] = useMemo(() => {
    const la = Number.parseFloat(lat);
    const lg = Number.parseFloat(lng);
    if (!Number.isNaN(la) && !Number.isNaN(lg)) return [la, lg];
    return [52.2297, 21.0122];
  }, [lat, lng]);

  const initialZoom = lat && lng && !Number.isNaN(Number.parseFloat(lat)) ? 14 : 6;

  /** Sygnatura do flyTo po geokodowaniu / zmianie propów. */
  const flySig = useMemo(() => {
    const la = Number.parseFloat(lat);
    const lg = Number.parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(lg)) return "";
    return `${la.toFixed(6)},${lg.toFixed(6)}`;
  }, [lat, lng]);

  const onPick = useCallback(
    (la: number, lg: number) => {
      setGeocodeMsg(null);
      onChange(la.toString(), lg.toString());
    },
    [onChange],
  );

  const handleGeocode = async () => {
    setGeocodeMsg(null);
    const q = address.trim();
    if (!q) {
      setGeocodeMsg(dict.geocodeNeedAddress);
      return;
    }

    setGeocodeBusy(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const data = (await res.json()) as { lat?: number; lng?: number; error?: string };

      if (!res.ok || typeof data.lat !== "number" || typeof data.lng !== "number") {
        setGeocodeMsg(dict.geocodeNoResults);
        return;
      }

      onChange(data.lat.toString(), data.lng.toString());
      setGeocodeMsg(null);
    } catch {
      setGeocodeMsg(dict.geocodeError);
    } finally {
      setGeocodeBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleGeocode()}
          disabled={geocodeBusy}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition"
        >
          {geocodeBusy ? dict.geocodeLoading : dict.geocodeBtn}
        </button>
      </div>
      {geocodeMsg ? <p className="text-xs text-amber-600 dark:text-amber-400">{geocodeMsg}</p> : null}
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">{dict.mapHint}</p>

      <div className="w-full h-[280px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 relative z-0">
        <MapContainer center={center} zoom={initialZoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <FlyToCoordinates latSig={flySig} />
          <MapPinLayer lat={lat} lng={lng} onPick={onPick} />
        </MapContainer>
      </div>
    </div>
  );
}
