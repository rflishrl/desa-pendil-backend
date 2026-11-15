import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    env: {
      DATABASE_URI: "postgresql://test:test@ep-test.neon.tech/neondb?sslmode=require",
      SESSION_SECRET: "0123456789abcdef0123456789abcdef",
      CRON_SECRET: "cron-secret-untuk-pengujian",
      R2_ACCESS_KEY_ID: "test-r2-access-key",
      R2_SECRET_ACCESS_KEY: "test-r2-secret-key",
      R2_ENDPOINT: "https://test-account.r2.cloudflarestorage.com",
      R2_BUCKET_NAME: "desa-pendil",
      R2_PUBLIC_DOMAIN: "https://media-dp.raflisahrul.my.id",
    },
  },
});
