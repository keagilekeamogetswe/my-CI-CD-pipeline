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
let profileViewClient;
let mysqlConnection;
let user_id;

describe("UserProfileGRPCClient", () => {
  beforeAll(async () => {
    process.env.USER_GRPC_HOST = "localhost";
    process.env.USER_GRPC_PORT = "50062";

    serverProcess = fork(
      path.resolve(__dirname, "../../microservices/user/grpc/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          GRPC_USER_PORT: process.env.USER_GRPC_PORT,
          HEALTH_PORT: "3012",
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

    ({ UserProfileGRPCClient: profileViewClient } = await import(
      "../../microservices/grpc-clients/user/profile.view.js"
    ));
  }, 15000);

  beforeEach(async () => {
    mysqlConnection = await Database.getSQLConnection();
    await mysqlConnection.beginTransaction();

    user_id = await CredentialsRepository.create(null, mysqlConnection);
    await ProfileRepository.create(
      {
        name: "Ada",
        lastname: "Lovelace",
        dob: "1815-12-10",
        user_id,
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
    } finally {
      mysqlConnection.release();
    }
  });

  afterAll(() => {
    profileViewClient?.close();
    serverProcess?.kill("SIGTERM");
  });

  it("retrieves the profile without exposing its user ID in profile data", async () => {
    await expect(
      profileViewClient.ViewProfile({ user_id }),
    ).resolves.toEqual({
      success: true,
      message: "Profile was retrieved successfully",
      data: {
        id: expect.any(String),
        name: "Ada",
        lastname: "Lovelace",
        dob: "12-10",
        bio: "",
        phone: "",
        profile_picture_url: `/api/profile/${user_id}/picture`,
      },
    });
  });

  it("rejects a request without a user ID", async () => {
    await expect(profileViewClient.ViewProfile()).rejects.toThrow(
      "Missing required field: user_id.",
    );
  });
});
