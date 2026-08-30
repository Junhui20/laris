import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The dashboard talks to the Worker in dev. `pnpm dev:api` must be running.
    proxy: { "/v1": "http://localhost:8787", "/site": "http://localhost:8787" },
  },
});
