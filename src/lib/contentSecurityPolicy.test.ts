import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/contentSecurityPolicy";

describe("buildContentSecurityPolicy", () => {
  it("produkcja: self + mapa (CARTO, OSM, Nominatim, OSRM) + Blob + unsafe-inline", () => {
    const csp = buildContentSecurityPolicy(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("https://*.basemaps.cartocdn.com");
    expect(csp).toContain("https://*.tile.openstreetmap.org");
    expect(csp).toContain("https://nominatim.openstreetmap.org");
    expect(csp).toContain("https://router.project-osrm.org");
    expect(csp).toContain("https://*.private.blob.vercel-storage.com");
    expect(csp).toContain("img-src");
    expect(csp).toContain("blob:");
    expect(csp).not.toMatch(/\bws:/);
  });

  it("dev: unsafe-eval + websocket HMR", () => {
    const csp = buildContentSecurityPolicy(true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toMatch(/\bws:/);
    expect(csp).toMatch(/\bwss:/);
  });
});
