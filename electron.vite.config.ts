import { defineConfig } from "electron-vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        external: ["better-sqlite3"],
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].js",
        },
      },
    },
  },
  renderer: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": resolve("src/renderer/src"),
      },
    },
  },
});
