import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    // Same prefixes frontend/nginx.conf proxies in prod, so dev is one origin too.
    // No changeOrigin on admin/static: Django must see Host: localhost:5173 or its
    // CSRF origin check rejects the admin login POST (dev has no .env, so
    // CSRF_TRUSTED_ORIGINS is empty). DRF is token-auth, so /api doesn't care.
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "^/(admin|static)/": { target: "http://localhost:8000" },
    },
  },
});
