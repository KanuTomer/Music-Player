import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const renderApiBaseUrl = process.env["RENDER_API_BASE_URL"]?.replace(/\/$/, "");
const localRenderProxy = renderApiBaseUrl
  ? {
      "/api/auth": {
        target: renderApiBaseUrl,
        changeOrigin: true,
        ws: true,
        configure: (proxy: {
          on: (
            event: string,
            listener: (request: { removeHeader: (name: string) => void }) => void,
          ) => void;
        }) => {
          proxy.on("proxyReq", (request) => request.removeHeader("origin"));
          proxy.on("proxyReqWs", (request) => request.removeHeader("origin"));
        },
      },
      "/api/v1": {
        target: renderApiBaseUrl,
        changeOrigin: true,
        ws: true,
        configure: (proxy: {
          on: (
            event: string,
            listener: (request: { removeHeader: (name: string) => void }) => void,
          ) => void;
        }) => {
          proxy.on("proxyReq", (request) => request.removeHeader("origin"));
          proxy.on("proxyReqWs", (request) => request.removeHeader("origin"));
        },
      },
    }
  : undefined;

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  define: {
    "import.meta.env.VITE_ENABLE_AMBIENCE_SOLO_PREVIEW": JSON.stringify(
      process.env["VITE_ENABLE_AMBIENCE_SOLO_PREVIEW"] === "true" ||
        process.env["VERCEL_ENV"] === "preview"
        ? "true"
        : "false",
    ),
  },
  build: {
    outDir: "dist-web",
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: localRenderProxy,
  },
});
