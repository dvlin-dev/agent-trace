import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/renderer/src"),
    },
  },
  test: {
    globals: true,
    setupFiles: ["tests/setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "renderer",
          include: ["tests/renderer/**/*.test.tsx"],
          environment: "happy-dom",
        },
      },
      {
        extends: true,
        test: {
          name: "harness",
          include: ["tests/harness/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
