import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "domain/**",
        "storage/**",
        "exports/**",
        "server/**",
        "lib/ai-response.ts",
      ],
      thresholds: { statements: 100, lines: 100, functions: 100, branches: 97 },
      reporter: ["text", "html", "json-summary"],
    },
  },
});
