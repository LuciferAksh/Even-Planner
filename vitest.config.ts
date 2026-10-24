import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["domain/**", "storage/**", "exports/**", "server/**"],
      reporter: ["text", "html", "json-summary"],
    },
  },
});
