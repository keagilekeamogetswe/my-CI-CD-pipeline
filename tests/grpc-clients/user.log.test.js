import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import argon2 from "argon2";
import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "../../microservices/user/db.js";
import { CredentialsRepository } from "../../microservices/user/credentials/repository.js";
import { LoginErrorRepository } from "../../microservices/user/config/login.errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let serverProcess;
let userLoginClient;
let mysqlConnection;
let userId;
const password = "some strong password!";

describe("UserLoginGRPCClient", () => {
  beforeAll(async () => {
    process.env.USER_GRPC_HOST = "localhost";

    serverProcess = fork(
      path.resolve(__dirname, "../../microservices/user/grpc/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: { ...process.env, GRPC_USER_PORT: "50051" },
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

    ({ UserLoginGRPCClient: userLoginClient } =
      await import("../../microservices/grpc-clients/user/user.log.js"));
  }, 15000);

  beforeEach(async () => {
    mysqlConnection = await Database.getSQLConnection();
    await mysqlConnection.execute(
      "INSERT IGNORE INTO dial_codes (abrv, dial_code, country) VALUES (?, ?, ?)",
      ["ZAR", "27", "South Africa"],
    );

    const [[dialCode]] = await mysqlConnection.execute(
      "SELECT id FROM dial_codes WHERE abrv = ?",
      ["ZAR"],
    );
    userId = await CredentialsRepository.create(
      await argon2.hash(password),
      mysqlConnection,
    );
    await CredentialsRepository.linkPhone(
      userId,
      { dial_code_id: dialCode.id, body: `123${userId}` },
      mysqlConnection,
    );
  });

  afterEach(async () => {
    try {
      const [[user]] = await mysqlConnection.execute(
        "SELECT phone_id FROM user_authentication WHERE id = ?",
        [userId],
      );
      await mysqlConnection.execute(
        "UPDATE user_authentication SET phone_id = NULL WHERE id = ?",
        [userId],
      );
      if (user?.phone_id) {
        await mysqlConnection.execute(
          "DELETE FROM phone_numbers WHERE id = ?",
          [user.phone_id],
        );
      }
      await mysqlConnection.execute(
        "DELETE FROM user_authentication WHERE id = ?",
        [userId],
      );
    } finally {
      mysqlConnection.release();
    }
  });

  afterAll(() => {
    userLoginClient?.close();
    serverProcess?.kill("SIGTERM");
  });

  it("logs in through the actual user gRPC server", async () => {
    await expect(
      userLoginClient.logIn({
        userId,
        password,
        deviceInfo: {
          device_name: "Vitest",
          finger_print: "grpc-client-test",
          ip_address: "127.0.0.1",
        },
      }),
    ).resolves.toMatchObject({
      success: true,
      refresh_token: expect.any(String),
    });
  });

  it("returns the server's invalid-credentials response", async () => {
    await expect(
      userLoginClient.logIn({
        userId,
        password: "wrong password",
        deviceInfo: JSON.stringify({ device_name: "Vitest" }),
      }),
    ).resolves.toMatchObject({
      success: false,
      message: LoginErrorRepository.INVALID_CREDENTIALS,
    });
  });

  it("returns the server's unexpected-error response for invalid device info", async () => {
    await expect(
      userLoginClient.logIn({
        userId,
        password,
        deviceInfo: "invalid-json-string",
      }),
    ).resolves.toMatchObject({
      success: false,
      message: LoginErrorRepository.UNEXPECTED_ERROR,
    });
  });

  it("rejects missing credentials before making an RPC", async () => {
    await expect(
      userLoginClient.logIn({ userId: "", password }),
    ).rejects.toThrow("userId and password are required");
  });
});
