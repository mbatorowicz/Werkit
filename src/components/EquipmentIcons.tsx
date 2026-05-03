import React from 'react';

// Wywrotka - opuszczona
export const DumpTruckLowered = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Paka */}
    <path d="M1 4h12v11H1z" />
    {/* Kabina */}
    <path d="M14 6h5l4 4v5h-9V6z" />
    <path d="M15.5 7.5v3H19l-2-3h-1.5z" fill="#fff" />
    {/* Podwozie */}
    <path d="M0 15h24v3H0z" />
    {/* Koła */}
    <circle cx="4" cy="19.5" r="3.5" />
    <circle cx="11" cy="19.5" r="3.5" />
    <circle cx="20" cy="19.5" r="3.5" />
  </svg>
);

// Wywrotka - podniesiona
export const DumpTruckRaised = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Paka (podniesiona) */}
    <path d="M3 14l11-8 2 3-11 8z" />
    <path d="M1 10l2-3 2 1.5-2 3z" />
    {/* Kabina */}
    <path d="M14 6h5l4 4v5h-9V6z" />
    <path d="M15.5 7.5v3H19l-2-3h-1.5z" fill="#fff" />
    {/* Podwozie */}
    <path d="M0 15h24v3H0z" />
    {/* Koła */}
    <circle cx="4" cy="19.5" r="3.5" />
    <circle cx="11" cy="19.5" r="3.5" />
    <circle cx="20" cy="19.5" r="3.5" />
  </svg>
);

// Koparka 1 (Duża)
export const Excavator1 = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Gąsienice */}
    <rect x="7" y="16" width="16" height="6" rx="3" />
    {/* Kabina i korpus */}
    <path d="M11 5h8v10h-8z" />
    <path d="M19 9h3v6h-3z" />
    <path d="M12.5 6.5v4H17v-4h-4.5z" fill="#fff" />
    {/* Ramię */}
    <path d="M12 11L7 1 0 5l-1 5 4 2 3-4 3-1 3 4z" />
    {/* Łyżka */}
    <path d="M0 11l3 5h5l-4-6z" />
  </svg>
);

// Koparka 2 (Mała)
export const Excavator2 = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Gąsienice */}
    <rect x="9" y="17" width="13" height="5" rx="2.5" />
    {/* Pług */}
    <path d="M21 14h3v5h-3z" />
    {/* Kabina */}
    <path d="M11 7h8v9h-8z" />
    <path d="M12.5 8.5v4H17v-4h-4.5z" fill="#fff" />
    {/* Ramię */}
    <path d="M12 12L8 3 2 6l-1 5 3 2 3-4 3-1 2 4z" />
    {/* Łyżka */}
    <path d="M0 11l3 4h4l-3-5z" />
  </svg>
);

// Ładowarka 1 (Kołowa duża)
export const Loader1 = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Podwozie */}
    <path d="M2 13h19v5H2z" />
    {/* Kabina */}
    <path d="M11 3h9v10h-9z" />
    <path d="M12.5 4.5v4h6v-4h-6z" fill="#fff" />
    {/* Ramię */}
    <path d="M13 11L5 13l-2 8h5l1-5 6-3z" />
    {/* Łyżka */}
    <path d="M0 13l3 8h6l-3-9z" />
    {/* Koła */}
    <circle cx="16" cy="18.5" r="4.5" />
    <circle cx="7" cy="18.5" r="4.5" />
  </svg>
);

// Ładowarka 2 (Skid-steer)
export const Loader2 = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Podwozie */}
    <path d="M3 13h16v5H3z" />
    {/* Kabina */}
    <path d="M9 4h8v9H9z" />
    <path d="M10.5 5.5v3.5h5v-3.5h-5z" fill="#fff" />
    {/* Ramię */}
    <path d="M11 10L4 13l-1 6h5l1-4 5-3z" />
    {/* Łyżka */}
    <path d="M0 12l2 7h6l-3-8z" />
    {/* Koła */}
    <circle cx="15" cy="18.5" r="3.5" />
    <circle cx="6" cy="18.5" r="3.5" />
  </svg>
);

// Warsztat - Klucz
export const WorkshopWrench = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22 6l-4-4-3 3c1 1 1 2 0 3-1 1-2 1-3 0L9 11 3 17c-1.5 1.5-1.5 4 0 5.5s4 1.5 5.5 0l6-6-3-3c-1-1-1-2 0-3 1-1 2-1 3 0l3-3 4-1z" />
  </svg>
);

// Warsztat - Budynek
export const WorkshopBuilding = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 1L0 11h3v12h18V11h3L12 1zM10 23v-8h4v8h-4z" />
  </svg>
);
