'use client';

import { useEffect, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import { useTheme } from 'next-themes';
import {
  getMapBasemapPreset,
  MAP_TILE_MAX_ZOOM,
  MAP_TILE_SUBDOMAINS,
} from '@/lib/map/mapBasemap';
import './mapLeafletTheme.css';

function MapThemeSync({ themeKey }: { themeKey: string }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    map.eachLayer((layer) => {
      if ('redraw' in layer && typeof layer.redraw === 'function') {
        layer.redraw();
      }
    });
  }, [themeKey, map]);
  return null;
}

/**
 * Jedna warstwa kafelków dla całej aplikacji — jasna / ciemna zgodnie z motywem UI.
 * Używaj wewnątrz `MapContainer` zamiast własnego `TileLayer`.
 */
export function WerkitTileLayer() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const preset = getMapBasemapPreset(isDark);
  const themeKey = preset.id;

  return (
    <>
      <MapThemeSync themeKey={themeKey} />
      {preset.layers.map((layer, index) => (
        <TileLayer
          key={`${themeKey}-${index}`}
          url={layer.url}
          attribution={layer.attribution ?? ''}
          subdomains={MAP_TILE_SUBDOMAINS}
          maxZoom={MAP_TILE_MAX_ZOOM}
          zIndex={layer.zIndex}
        />
      ))}
    </>
  );
}
