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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const grpcPort = "50062";
const grpcHealthPort = "3014";
const webPort = "3013";
const accessTokenKey = "profile-route-test-key";
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
let viewerAccessToken;
let storedFilename;

describe("profile setup routes", () => {
  beforeAll(async () => {
    mysqlConnection = await Database.getSQLConnection();
    ownerId = await createUserWithProfile("Owner");
    viewerId = await createUserWithProfile("Viewer");

    const expiresAt = new Date(Date.now() + 60_000);
    ownerAccessToken = await JWTHelper.sign(
      { user_id: ownerId },
      expiresAt,
      accessTokenKey,
    );
    viewerAccessToken = await JWTHelper.sign(
      { user_id: viewerId },
      expiresAt,
      accessTokenKey,
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
          JWT_ACCESSS_TOKEN_PUBLIC_KEY: accessTokenKey,
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

    await mysqlConnection.execute(
      "DELETE FROM user_profiles WHERE user_id IN (?, ?)",
      [ownerId, viewerId],
    );
    await mysqlConnection.execute(
      "DELETE FROM user_authentication WHERE id IN (?, ?)",
      [ownerId, viewerId],
    );
    // mysqlConnection.();
  });

  it("uploads profile data ", async () => {
    const form = new FormData();
    form.append("bio", "Profile route integration test");
    form.append(
      "profile_picture",
      new Blob([uploadedImage], { type: "image/jpeg" }),
      path.basename(profileUploadPath),
    );

    const updateResponse = await fetch(
      `http://localhost:${webPort}/api/start/profile`,
      {
        method: "POST",
        /*
        headers: { authorization: `Bearer ${ownerAccessToken}` },
        body: form,
        */
        headers: { authorization: "Bearer " + ownerAccessToken },
        body: form,
      },
    );
    const updateResponseBody = await updateResponse.text();
    expect(updateResponse.status, updateResponseBody).toBe(200);

    const [[profile]] = await mysqlConnection.execute(
      "SELECT bio, profile_picture FROM user_profiles WHERE user_id = ?",
      [ownerId],
    );
    storedFilename = profile.profile_picture;

    expect(profile.bio).toBe("Profile route integration test");
    expect(storedFilename).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f-]+\.jpg$/,
    );

    const ownerPictureResponse = await fetch(
      `http://localhost:${webPort}/api/profile/${ownerId}/picture`,
      { headers: { authorization: `Bearer ${ownerAccessToken}` } },
    );
    expect(ownerPictureResponse.status).toBe(200);
    expect(ownerPictureResponse.headers.get("content-type")).toContain(
      "image/jpeg",
    );
    const storedImage = Buffer.from(await ownerPictureResponse.arrayBuffer());
    await expect(sharp(storedImage).metadata()).resolves.toMatchObject({
      format: "jpeg",
      width: 500,
      height: 500,
    });

    const viewerPictureResponse = await fetch(
      `http://localhost:${webPort}/api/profile/${ownerId}/picture`,
      { headers: { authorization: `Bearer ${viewerAccessToken}` } },
    );
    expect(viewerPictureResponse.status).toBe(200);
    expect(Buffer.from(await viewerPictureResponse.arrayBuffer())).toEqual(
      storedImage,
    );
  });

  it("rejects a non-square JPEG profile picture", async () => {
    const form = new FormData();
    form.append(
      "profile_picture",
      new Blob([nonSquareImage], { type: "image/jpeg" }),
      "non-square.jpg",
    );

    const response = await fetch(
      `http://localhost:${webPort}/api/start/profile`,
      {
        method: "POST",
        /*
        headers: { authorization: `****** },
        body: form,
        */
        headers: { authorization: "Bearer " + ownerAccessToken },
        body: form,
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Profile picture must be square.",
    });
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
