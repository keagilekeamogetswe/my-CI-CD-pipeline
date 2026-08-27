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
import fs from "node:fs";
import { Database } from "../../../microservices/user/db.js";
import { JWTHelper } from "../../../microservices/utility/jwt.js";
import argon2 from "argon2";
import { AccountAuthToken } from "../../../microservices/user/user-flow/account.auth.tokens.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let serverProcess;
let accountConfirmClient;
let accountRequestClient;
let AuthenticationGRPCClient;
let mysqlConnection;
let dial_code_id;
let verificationToken;
let refreshToken;

const read_code_file_uri = path.resolve(
  __dirname,
  "../../../tests/.output/code.txt",
);

// Utility to read the verification code written by Notification mock
function readFileContents(filePath) {
  return fs.readFileSync(filePath, "utf8").trim();
}
function attachLogger(childProcess, label) {
  childProcess.stdout?.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => {
      if (line) console.log(`\x1b[36m[${label}]\x1b[0m ${line}`);
    });
  });

  childProcess.stderr?.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => {
      if (line) console.error(`\x1b[31m[${label} ERROR]\x1b[0m ${line}`);
    });
  });
}
describe("Account lifecycle gRPC tests", () => {
  beforeAll(async () => {
    process.env.USER_GRPC_HOST = "localhost";

    serverProcess = fork(
      path.resolve(__dirname, "../../../microservices/user/grpc/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          GRPC_USER_PORT: "50051",
          TEST_VERIFICATION_DIFF: read_code_file_uri,
          ENV: "test",
        },
        silent: false,
      },
    );

    attachLogger(serverProcess, "gRPC Service");

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

    ({ UserCreateAccountRequestGRPCClient: accountRequestClient } =
      await import("../../../microservices/grpc-clients/user/account.creation.request.js"));
    ({ UserCreateAccountConfirmGRPCClient: accountConfirmClient } =
      await import("../../../microservices/grpc-clients/user/account.creation.confirm.js"));
    ({ AuthenticationGRPCClient } =
      await import("../../../microservices/grpc-clients/user/access.token.renew.js"));
  }, 15000);

  beforeEach(async () => {
    mysqlConnection = await Database.getSQLConnection();

    await mysqlConnection.execute(
      "INSERT IGNORE INTO dial_codes (abrv, dial_code, country) VALUES (?, ?, ?)",
      ["ZAR", "27", "South Africa"],
    );
    const [[dial_code_results]] = await mysqlConnection.execute(
      "SELECT id FROM dial_codes WHERE abrv = ?",
      ["ZAR"],
    );
    dial_code_id = dial_code_results.id;

    const requestRes = await accountRequestClient.CreateAccountRequest({
      name: "Test",
      lastname: "User",
      dob: "1990-01-01",
      phone: { code: "+27", body: "1234567890", dial_code_id },
      device_info: JSON.stringify({ device_name: "Vitest" }),
      ip_address: "127.0.0.1",
      fp_hash: "grpc-test-hash",
    });
    verificationToken = requestRes.verification_token;
  });

  afterEach(async () => {
    mysqlConnection.release();
  });

  afterAll(() => {
    accountRequestClient?.close();
    accountConfirmClient?.close();
    AuthenticationGRPCClient?.close();
    serverProcess?.kill("SIGTERM");
  });

  it("confirms account creation with valid token and code", async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const code = readFileContents(read_code_file_uri);

    const key = process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY;
    const { payload } = await JWTHelper.decode(verificationToken, key);
    const verified = await argon2.verify(payload.otp_hash, code);
    expect(verified).toBe(true);

    const res = await accountConfirmClient.CreateAccountConfirm({
      verification_token: verificationToken,
      code,
    });

    expect(res).toMatchObject({
      success: true,
      refresh_token: expect.any(String),
      message: "Account created successfully",
    });

    refreshToken = res.refresh_token;
  });

  it("renews access token and rotates refresh token", async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const response = await AuthenticationGRPCClient.RenewAccessToken({
      refresh_token: refreshToken,
    });

    expect(response.success).toBe(true);
    expect(response.access_token).toEqual(expect.any(String));
    expect(response.refresh_token).not.toEqual(refreshToken);
  });

  it("rejects missing verification token", async () => {
    await expect(
      accountConfirmClient.CreateAccountConfirm({
        verification_token: "",
        code: "123456",
      }),
    ).rejects.toThrow("Missing required fields: verification_token and code.");
  });
});
