import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set VITE_API_URL in your environment or .env.local to point at the live backend.
// Leave blank to proxy through localhost:8000 during development.
const apiTarget = process.env.VITE_API_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from a subdirectory — set base to your repo name.
  // Change "news-bias-website" to match your actual GitHub repo name.
  base: process.env.NODE_ENV === "production" ? "/news-bias-website/" : "/",
  server: {
    proxy: {
      "/api": apiTarget,
    },
  },
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || ""),
  },
});
