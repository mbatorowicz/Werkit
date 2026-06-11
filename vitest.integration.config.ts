import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Testy integracyjne na PRAWDZIWEJ bazie z `.env.local` (DATABASE_URL / POSTGRES_URL).
 * Uruchamianie: `npm run test:integration` — celowo POZA `npm test` (CI nie ma bazy).
 * Każdy plik testowy tworzy własną firmę-fixture i sprząta po sobie (src/test/integrationDb.ts).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
  test: {
    name: "integration",
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    passWithNoTests: false,
    // Sekwencyjnie — wspólna baza; równoległość grozi konfliktami puli połączeń Neon.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
