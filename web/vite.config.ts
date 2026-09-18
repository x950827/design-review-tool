import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root,
  publicDir: path.resolve(root, "public"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
