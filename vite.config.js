import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "prompt",

      includeAssets: [
        "favicon.svg",
        "pwa-192x192.png",
        "pwa-512x512.png"
      ],

      manifest: {
        name: "Il était une voix dans l'Est",
        short_name: "Voix dans l'Est",

        description:
          "Application de la chorale Il était une voix dans l'Est",

        lang: "fr",

        id: "/",
        start_url: "/?pwa=1",
        scope: "/",

        display: "standalone",

        background_color: "#ffffff",
        theme_color: "#ffffff",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true
      }
    })
  ]
});