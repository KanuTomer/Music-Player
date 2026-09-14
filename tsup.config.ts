import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/render/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist-render",
  clean: true,
  splitting: true,
  sourcemap: true,
  outExtension: () => ({ js: ".mjs" }),
});
