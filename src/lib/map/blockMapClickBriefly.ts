/** Po akcji w popupie markera — ignoruj kolejny click na mapie (Leaflet „przenosi” klik pod popup). */
let blockedUntilMs = 0;

export function blockMapClickBriefly(durationMs = 400): void {
  blockedUntilMs = Date.now() + durationMs;
}

export function isMapClickBlocked(): boolean {
  return Date.now() < blockedUntilMs;
}
