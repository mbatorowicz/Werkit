import { afterAll } from "vitest";

// Vitest nie ładuje .env.local jak Next.js — wczytujemy ręcznie (Node >= 20.12).
try {
  process.loadEnvFile(".env.local");
} catch {
  throw new Error(
    "Testy integracyjne wymagają .env.local z DATABASE_URL / POSTGRES_URL (baza testowa)."
  );
}

// Po każdym pliku testowym próbujemy zamknąć pulę połączeń; jeśli driver zwleka,
// nie blokujemy zakończenia — worker forka i tak zostaje ubity po pliku.
afterAll(async () => {
  const { pool } = await import("@/db");
  await Promise.race([
    pool.end().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
});
