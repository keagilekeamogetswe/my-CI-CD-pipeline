import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "../../microservices/user/db.js";
import { CredentialsRepository } from "../../microservices/user/credentials/repository.js";
import { ProfileRepository } from "../../microservices/user/profile/repository.js";
import { JWTHelper } from "../../microservices/utility/jwt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const grpcPort = "50063";
const grpcHealthPort = "3016";
const webPort = "3015";

let grpcServerProcess;
let webServerProcess;
let mysqlConnection;
let userId;
let accessToken;

describe("profile view route", () => {
  beforeAll(async () => {
    mysqlConnection = await Database.getSQLConnection();
    userId = await CredentialsRepository.create(null, mysqlConnection);
    await ProfileRepository.create(
      {
        name: "Ada",
        lastname: "Lovelace",
        dob: "1815-12-10",
        user_id: userId,
        phone_id: null,
      },
      mysqlConnection,
    );

    accessToken = await JWTHelper.sign(
      { user_id: userId },
      new Date(Date.now() + 60_000),
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
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      },
    );
    await waitForReady(webServerProcess, "Swift web server");
  }, 20000);

  afterAll(async () => {
    webServerProcess?.kill("SIGTERM");
    grpcServerProcess?.kill("SIGTERM");

    if (mysqlConnection && userId) {
      await mysqlConnection.execute(
        "DELETE FROM user_profiles WHERE user_id = ?",
        [userId],
      );
      await mysqlConnection.execute(
        "DELETE FROM user_authentication WHERE id = ?",
        [userId],
      );
    }
    mysqlConnection?.release();
  });

  it("returns the authenticated user's profile without the user ID", async () => {
    const response = await fetch(`http://localhost:${webPort}/api/profile/view`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const responseBody = await response.json();

    expect(response.status, JSON.stringify(responseBody)).toBe(200);
    expect(responseBody).toEqual({
      message: "Profile was retrieved successfully",
      data: {
        id: expect.any(String),
        name: "Ada",
        lastname: "Lovelace",
        dob: "1815-12-10",
        bio: "",
        phone: "",
        profile_picture: "",
      },
    });
    expect(responseBody.data).not.toHaveProperty("user_id");
  });
});

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
