import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET;

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg"],
        manifest: {
          name: "CarbTrack Tablet",
          short_name: "CarbTrack",
          description: "Recipe builder for the carbtrack-au food database",
          theme_color: "#18181b",
          background_color: "#fafafa",
          display: "standalone",
          start_url: "/",
          icons: [],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // The carbtrack-au backend doesn't set CORS headers, so cross-origin
    // fetches from `npm run dev` get blocked. With VITE_DEV_API_PROXY_TARGET
    // set, the dev server proxies /api/* to the upstream and the browser
    // sees the requests as same-origin. Production hosting puts the tablet
    // behind the same reverse proxy as the API (Phase 6), so this is dev-only.
    server: proxyTarget
      ? {
          proxy: {
            "/api": {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/api/, ""),
            },
          },
        }
      : undefined,
  };
});
