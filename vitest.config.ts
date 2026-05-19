import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Le sentinel `server-only` throw à l'import en environnement non-server.
      // Vitest n'a pas de notion server/client, donc on aliase vers un stub vide.
      "server-only": resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    globals: false,
    reporters: ["default"],
  },
});
