import { defineConfig, configDefaults } from "vitest/config";
// Auto add .env for tests
import dotenv from "dotenv";

dotenv.config({ path: "./tests/.env" });

export default defineConfig({
  test: {
    // 1. Force test files to run one after the other instead of in parallel
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // 2. Ensure individual tests within a file don't run concurrently by default
    sequence: {
      concurrent: false,
    },
    exclude: [
      ...configDefaults.exclude,
      "**/deprecated/**",
      "**/tests/**/.ingore", // Note: typo in your config '.ignore'?
      "**/tests/**/deprecated/**",
    ],
    envFiles: ["**/tests/.env"],
  },
});
