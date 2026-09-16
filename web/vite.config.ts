import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.dirname(new URL(import.meta.url).pathname),
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
