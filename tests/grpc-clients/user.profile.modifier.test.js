import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "../../microservices/user/db.js";
import { CredentialsRepository } from "../../microservices/user/credentials/repository.js";
import { ProfileRepository } from "../../microservices/user/profile/repository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let serverProcess;
let profileModifierClient;
let mysqlConnection;
let profileCollection;
let user_id;

describe("UserProfileModifierGRPCClient", () => {
  beforeAll(async () => {
    process.env.USER_GRPC_HOST = "localhost";
    process.env.USER_GRPC_PORT = "50061";

    serverProcess = fork(
      path.resolve(__dirname, "../../microservices/user/grpc/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          GRPC_USER_PORT: process.env.USER_GRPC_PORT,
          HEALTH_PORT: "3011",
        },
        silent: false,
      },
    );

    await new Promise((resolve, reject) => {
      serverProcess.once("message", (message) => {
        if (message.type === "READY") resolve();
      });
      serverProcess.once("error", reject);
      serverProcess.once("exit", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`User gRPC server exited with code ${code}`));
        }
      });
    });

    ({ UserProfileModifierGRPCClient: profileModifierClient } =
      await import("../../microservices/grpc-clients/user/profile.modifier.js"));
  }, 15000);

  beforeEach(async () => {
    mysqlConnection = await Database.getSQLConnection();
    profileCollection = await Database.getMongoConnection("user_profiles");
    await mysqlConnection.beginTransaction();

    user_id = await CredentialsRepository.create(null, mysqlConnection);
    console.log({ user_id });
    await ProfileRepository.create(
      {
        name: "Initial",
        lastname: "Name",
        dob: "1990-01-01",
        user_id: user_id,
        phone_id: null,
      },
      mysqlConnection,
    );

    await mysqlConnection.commit();
  });

  afterEach(async () => {
    try {
      await mysqlConnection.execute(
        "DELETE FROM user_profiles WHERE user_id = ?",
        [user_id],
      );
      await mysqlConnection.execute(
        "DELETE FROM user_authentication WHERE id = ?",
        [user_id],
      );
      await profileCollection.deleteMany({ profile: String(user_id) });
    } finally {
      mysqlConnection.release();
    }
  });

  afterAll(() => {
    profileModifierClient?.close();
    serverProcess?.kill("SIGTERM");
  });

  it("updates primary profile fields through the gRPC server", async () => {
    await expect(
      profileModifierClient.ModifyProfile({
        user_id: user_id,
        primaryConfig: {
          name: "Updated",
          lastname: "Profile",
          bio: "Updated over gRPC",
        },
      }),
    ).resolves.toEqual({
      success: true,
      message: "Profile was successfully updated",
      config: {},
      method: "update",
    });

    const [[profile]] = await mysqlConnection.execute(
      "SELECT name, lastname, bio FROM user_profiles WHERE user_id = ?",
      [user_id],
    );

    expect(profile).toEqual({
      name: "Updated",
      lastname: "Profile",
      bio: "Updated over gRPC",
    });
  });

  it("rejects requests without a user ID", async () => {
    await expect(
      profileModifierClient.ModifyProfile({
        primaryConfig: { name: "Updated" },
      }),
    ).rejects.toThrow("Missing required field: user_id.");
  });

  it("updates secondary profile configuration through the gRPC server", async () => {
    await expect(
      profileModifierClient.ModifyProfile({
        user_id: user_id,
        config: {
          online: "nobody",
          about: "contacts",
        },
      }),
    ).resolves.toEqual({
      success: true,
      message: "Profile was successfully updated",
      config: {},
      method: "update",
    });

    const profileConfig = await profileCollection.findOne({
      profile: String(user_id),
    });

    expect(profileConfig.settings).toEqual({
      online: "nobody",
      about: "contacts",
    });
  });

  it("gets profile configuration merged with defaults through the same gRPC client", async () => {
    await profileCollection.updateOne(
      { profile: String(user_id) },
      { $set: { "settings.online": "nobody" } },
      { upsert: true },
    );

    await expect(
      profileModifierClient.ModifyProfile({
        user_id,
        method: "get",
      }),
    ).resolves.toEqual({
      success: true,
      message: "Profile configuration retrieved successfully",
      config: {
        lastseen: "contacts",
        profile_picture: "everyone",
        about: "everyone",
        online: "nobody",
      },
      method: "get",
    });
  });

  it("exposes a get helper without creating another gRPC client", async () => {
    await profileCollection.updateOne(
      { profile: String(user_id) },
      { $set: { "settings.about": "contacts" } },
      { upsert: true },
    );

    await expect(
      profileModifierClient.GetProfileConfig({
        user_id,
      }),
    ).resolves.toEqual({
      lastseen: "contacts",
      profile_picture: "everyone",
      about: "contacts",
      online: "contacts",
    });
  });

  it("rejects requests containing both update types", async () => {
    await expect(
      profileModifierClient.ModifyProfile({
        user_id: user_id,
        primaryConfig: { name: "Updated" },
        config: { online: "contacts" },
      }),
    ).rejects.toThrow(
      "Provide exactly one non-empty update: primaryConfig or config.",
    );
  });
});
