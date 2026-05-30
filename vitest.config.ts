import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: false,
    // Wyłączamy izolację modułów, ponieważ testy używają vi.mock() z dynamicznym importem,
    // co powoduje timeouty w trybie izolacji. Testy działają poprawnie bez izolacji.
    isolate: false,
  },
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
});
