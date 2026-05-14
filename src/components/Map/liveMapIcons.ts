import L from "leaflet";
import styles from "./LiveMap.module.css";

export const iconStart = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const iconCurrent = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const iconDest = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const iconEvent = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export const iconPhoto = L.divIcon({
  html: `<div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid #8b5cf6; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const iconNote = L.divIcon({
  html: `<div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid #f97316; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/**
 * Zamiast obracać mapPane (psuje pan/zoom i synchronizację kafelków Leafleta),
 * pokazujemy azymut na samym znaczniku — mapa zostaje północ-w-górę.
 */
export function createCurrentLocationIcon(opts: {
  showHeadingNeedle: boolean;
  heading: number | null | undefined;
}): L.Icon | L.DivIcon {
  const { showHeadingNeedle, heading } = opts;
  if (!showHeadingNeedle || heading === undefined || heading === null || !Number.isFinite(heading)) {
    return iconCurrent;
  }
  const angle = heading;
  return L.divIcon({
    className: styles.markerRoot,
    html: `<div style="width:48px;height:48px;position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:26px solid #2563eb;transform:rotate(${angle}deg);transform-origin:50% 90%;filter:drop-shadow(0 1px 2px rgb(0 0 0 / 0.35));top:2px;pointer-events:none;"></div>
      <div style="width:13px;height:13px;background:#1d4ed8;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgb(0 0 0 / 0.45);z-index:1;"></div>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}
