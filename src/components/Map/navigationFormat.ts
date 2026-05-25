/** Format distance in a human-readable way (meters or kilometers). */
export function formatNavigationDistance(meters: number): string {
  if (meters < 50) return "ok. 50 m";
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format duration in a human-readable way. */
export function formatNavigationDuration(seconds: number): string {
  if (seconds < 60) return "<1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}
