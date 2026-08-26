import { defineConfig, configDefaults } from "vitest/config";
// Auto add .env for tests
import dotenv from "dotenv";
import { generateKeyPairSync } from "crypto";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// write these to env variables
process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY = publicKey;
process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY = privateKey;

dotenv.config({ path: "./tests/.env" });

export default defineConfig({
  test: {
    testTimeout: 30000,
    // 1. Force test files to run one after the other instead of in parallel
    pool: "threads",
    singleThread: true,
    // 2. Ensure individual tests within a file don't run concurrently by default
    sequence: {
      concurrent: false,
    },
    exclude: [
      ...configDefaults.exclude,
      "**/deprecated/**",
      "**/tests/**/.ignore",
      "**/tests/**/deprecated/**",
      "**/microservices/**",
    ],
    envFiles: ["**/tests/.env"],
  },
});
