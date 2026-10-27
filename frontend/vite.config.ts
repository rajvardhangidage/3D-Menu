import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  if (mode === "production") {
    const apiBaseUrl = loadEnv(mode, ".", "VITE_").VITE_API_BASE_URL?.trim();
    if (!apiBaseUrl) {
      throw new Error("Set VITE_API_BASE_URL to the deployed API base URL before building for production.");
    }
    const apiUrl = apiBaseUrl.match(/^https:\/\/[^/?#\s]+(\/[^?#\s]*)?$/i);
    if (!apiUrl?.[1]?.replace(/\/+$/, "").endsWith("/api/v1")) {
      throw new Error("VITE_API_BASE_URL must be an absolute HTTPS URL ending in /api/v1.");
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/three/")) return "three-vendor";
            if (id.includes("/node_modules/@react-three/")) return "react-three-vendor";
          },
        },
      },
    },
  };
});
