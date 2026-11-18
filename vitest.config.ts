import { configDefaults, defineConfig } from "vitest/config";

// assistant-worker has its own Node test runner (`node --test`, see
// assistant-worker/package.json), so Vitest skips it to avoid
// "No test suite found". Help: https://vitest.dev/config/#exclude
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "assistant-worker/**"],
  },
});
