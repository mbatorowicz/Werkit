import pkg from '../../package.json';

// Pobieramy wersję z package.json
const baseVersion = pkg.version;

// Vercel wstrzykuje tę zmienną podczas budowania aplikacji.
// Jeśli jest dostępna (produkcja), doczepiamy krótki hash (np. v1.5.2-a1b2c3d)
const gitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA 
  ? `-${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7)}` 
  : '';

export const APP_VERSION = `${baseVersion}${gitHash}`;
