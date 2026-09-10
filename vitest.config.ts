import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["apps/**/*.{test,spec}.ts", "packages/**/*.{test,spec}.ts"],
  },
});
