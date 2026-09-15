import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "../../microservices/user/db.js";
import { CredentialsRepository } from "../../microservices/user/credentials/repository.js";
import { ProfileRepository } from "../../microservices/user/profile/repository.js";
import { JWTHelper } from "../../microservices/utility/jwt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const grpcPort = "50062";
const grpcHealthPort = "3014";
const webPort = "3013";

let grpcServerProcess;
let webServerProcess;
let mysqlConnection;
let profileCollection;
let ownerId;
let viewerId;
let ownerAccessToken;

describe("profile configure routes", () => {
  beforeAll(async () => {
    mysqlConnection = await Database.getSQLConnection();
    profileCollection = await Database.getMongoConnection("user_profiles");
    ownerId = await createUserWithProfile("Owner");
    viewerId = await createUserWithProfile("Viewer");

    const expiresAt = new Date(Date.now() + 60_000);
    ownerAccessToken = await JWTHelper.sign(
      { user_id: ownerId },
      expiresAt,
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

  afterEach(async () => {
    await profileCollection.deleteMany({
      profile: { $in: [String(ownerId), String(viewerId)] },
    });
  });

  afterAll(async () => {
    webServerProcess?.kill("SIGTERM");
    grpcServerProcess?.kill("SIGTERM");

    await profileCollection.deleteMany({
      profile: { $in: [String(ownerId), String(viewerId)] },
    });
    await mysqlConnection.execute(
      "DELETE FROM user_profiles WHERE user_id IN (?, ?)",
      [ownerId, viewerId],
    );
    await mysqlConnection.execute(
      "DELETE FROM user_authentication WHERE id IN (?, ?)",
      [ownerId, viewerId],
    );
    mysqlConnection.release();
  });

  it("stores a non-default profile setting in MongoDB", async () => {
    const response = await fetch(
      `http://localhost:${webPort}/api/profile/configure`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer " + ownerAccessToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({ online: "nobody" }),
      },
    );
    const responseBody = await response.json();

    expect(response.status, JSON.stringify(responseBody)).toBe(200);
    expect(responseBody).toEqual({
      message: "Profile was successfully updated",
    });

    const profileConfig = await profileCollection.findOne({
      profile: String(ownerId),
    });
    expect(profileConfig).toMatchObject({
      profile: String(ownerId),
      settings: { online: "nobody" },
    });
  });

  it("removes the MongoDB override when the config is reset to default", async () => {
    const setResponse = await fetch(
      `http://localhost:${webPort}/api/profile/configure`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer " + ownerAccessToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({ online: "nobody" }),
      },
    );
    expect(setResponse.status).toBe(200);

    const storedConfig = await profileCollection.findOne({
      profile: String(ownerId),
    });
    expect(storedConfig?.settings?.online).toBe("nobody");

    const resetResponse = await fetch(
      `http://localhost:${webPort}/api/profile/configure`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer " + ownerAccessToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({ online: "contacts" }),
      },
    );
    const resetResponseBody = await resetResponse.json();

    expect(resetResponse.status, JSON.stringify(resetResponseBody)).toBe(200);
    expect(resetResponseBody).toEqual({
      message: "Profile was successfully updated",
    });

    const profileConfig = await profileCollection.findOne({
      profile: String(ownerId),
    });
    expect(profileConfig?.settings?.online).toBeUndefined();
  });
  it("should get config using url", async () => {
    // First, set the profile config to "contacts" to ensure the GET request retrieves it
    const resetResponse = await fetch(
      `http://localhost:${webPort}/api/profile/configure`,
      {
        method: "PUT",
        headers: {
          authorization: "Bearer " + ownerAccessToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({ online: "everyone" }),
      },
    );
    const resetResponseBody = await resetResponse.json();

    expect(resetResponse.status, JSON.stringify(resetResponseBody)).toBe(200);
    const response = await fetch(
      `http://localhost:${webPort}/api/profile/configure`,
      {
        method: "GET",
        headers: {
          authorization: "Bearer " + ownerAccessToken,
          "content-type": "application/json",
        },
      },
    );
    const responseBody = await response.json();
    expect(response.status).toBe(200);
    console.log("GET /api/profile/configure response: ", responseBody);
    expect(responseBody.config?.online).toEqual("everyone");
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
