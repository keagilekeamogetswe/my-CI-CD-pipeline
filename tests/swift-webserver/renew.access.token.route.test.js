import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fork } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Database } from "../../microservices/user/db.js";
import { CredentialsRepository } from "../../microservices/user/credentials/repository.js";
import { ProfileRepository } from "../../microservices/user/profile/repository.js";
import { JWTHelper } from "../../microservices/utility/jwt.js";
import { AccountAuthToken } from "../../microservices/user/user-flow/account.auth.tokens.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fixed: Changed from 50062 to avoid Windows Hyper-V / WSL port exclusion ranges
const grpcPort = "50051";
const grpcHealthPort = "3014";
const webPort = "3013";

const profileUploadPath = path.resolve(__dirname, "profile.upload.jpg");
const uploadedImage = await readFile(profileUploadPath);
const nonSquareImage = await sharp({
  create: {
    width: 76,
    height: 60,
    channels: 3,
    background: { r: 128, g: 0, b: 128 },
  },
})
  .jpeg()
  .toBuffer();

let grpcServerProcess;
let webServerProcess;
let mysqlConnection;
let ownerId;
let viewerId;
let ownerAccessToken;
let refresh_token;
let viewerAccessToken;

describe("profile setup routes", () => {
  beforeAll(async () => {
    mysqlConnection = await Database.getSQLConnection();
    ownerId = await createUserWithProfile("Owner");
    viewerId = await createUserWithProfile("Viewer");

    const expiresAt = new Date(Date.now() + 60_000);

    // Fixed: Typo in env variable (JWT_ACCESS_TOKEN_PRIVATE_KEY)
    ownerAccessToken = await JWTHelper.sign(
      { user_id: ownerId },
      expiresAt,
      process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY ||
        process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY,
    );
    viewerAccessToken = await JWTHelper.sign(
      { user_id: viewerId },
      expiresAt,
      process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY ||
        process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY,
    );

    grpcServerProcess = fork(
      path.resolve(__dirname, "../../microservices/user/grpc/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          GRPC_USER_PORT: grpcPort,
          HEALTH_PORT: grpcHealthPort,
        },
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      },
    );
    await waitForReady(grpcServerProcess, "User gRPC server");

    webServerProcess = fork(
      path.resolve(__dirname, "../../microservices/swift-webserver/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          PORT: webPort,
          USER_GRPC_HOST: "localhost",
          USER_GRPC_PORT: grpcPort,
        },
        silent: false,
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      },
    );
    await waitForReady(webServerProcess, "Swift web server");
  }, 20000);

  afterAll(async () => {
    webServerProcess?.kill("SIGTERM");
    grpcServerProcess?.kill("SIGTERM");

    if (mysqlConnection) {
      await mysqlConnection.execute(
        "DELETE FROM user_profiles WHERE user_id IN (?, ?)",
        [ownerId, viewerId],
      );
      await mysqlConnection.execute(
        "DELETE FROM user_authentication WHERE id IN (?, ?)",
        [ownerId, viewerId],
      );
    }
  });

  it("renew access token", async () => {
    const updateResponse = await fetch(
      `http://localhost:${webPort}/api/access-token`,
      {
        method: "GET",
        headers: {
          // Fixed: Cookies must be passed in headers, not as a top-level option
          Cookie: "refresh_token=" + refresh_token,
        },
      },
    );

    const data = await updateResponse.json();
    expect(data.access_token).toBeDefined();
    expect(updateResponse.headers.get("set-cookie")).toBeDefined();
    expect(updateResponse.status).toBe(200);
  });
});

async function createUserWithProfile(name) {
  const userId = await CredentialsRepository.create(null, mysqlConnection);
  await ProfileRepository.create(
    {
      name,
      lastname: "Test",
      dob: "1990-01-01",
      user_id: userId,
      phone_id: null,
    },
    mysqlConnection,
  );
  refresh_token = await AccountAuthToken.refresh.create(
    {
      ip_address: "127.0.0.1",
      device_info: "test-device",
      finger_print: "test-fingerprint",
      user_id: userId,
    },
    mysqlConnection,
  );
  return userId;
}

function waitForReady(process, label) {
  return new Promise((resolve, reject) => {
    process.once("message", (message) => {
      if (message.type === "READY") resolve();
    });
    process.once("error", reject);
    process.once("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });
  });
}
