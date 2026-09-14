import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
  },
});
