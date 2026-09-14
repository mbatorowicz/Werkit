/**
 * Content-Security-Policy (S3).
 *
 * `script-src 'unsafe-inline'`: Next.js App Router wstrzykuje inline bootstrap / hydration
 * bez nonce w tym programie. Leaflet jest w bundlu (`'self'`), nie z CDN.
 * `style-src 'unsafe-inline'`: Leaflet ustawia style na pane mapy.
 * Dev: `'unsafe-eval'` + `ws:`/`wss:` — HMR Turbopack.
 */
export function buildContentSecurityPolicy(isDev: boolean): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const connectDev = isDev ? " ws: wss:" : "";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    [
      "img-src 'self' data: blob:",
      "https://*.basemaps.cartocdn.com",
      "https://*.tile.openstreetmap.org",
      "https://raw.githubusercontent.com",
      "https://cdnjs.cloudflare.com",
      "https://*.public.blob.vercel-storage.com",
      "https://*.private.blob.vercel-storage.com",
    ].join(" "),
    [
      "connect-src 'self'",
      "https://nominatim.openstreetmap.org",
      "https://router.project-osrm.org",
      "https://*.basemaps.cartocdn.com",
      "https://*.public.blob.vercel-storage.com",
      "https://*.private.blob.vercel-storage.com",
      connectDev,
    ]
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
    "font-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}
