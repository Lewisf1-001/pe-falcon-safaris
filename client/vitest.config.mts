import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@notification-triggers": path.resolve(
        __dirname,
        "../supabase/functions/_shared/notification-triggers.ts"
      ),
    },
  },
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["e2e/**/*"],
  },
});
