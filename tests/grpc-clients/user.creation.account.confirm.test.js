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
import { Database } from "../../microservices/user/db.js";
import { JWTHelper } from "../../microservices/utility/jwt.js";
import argon2 from "argon2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let serverProcess;
let accountConfirmClient;
let accountRequestClient;
let mysqlConnection;
let dial_code_id;
let verificationToken;
const read_code_file_uri = path.resolve(
  __dirname,
  "../../tests/.output/code.txt",
);

// Utility to read the verification code written by Notification mock
function readFileContents(filePath) {
  return fs.readFileSync(filePath, "utf8").trim();
}

describe("UserCreateAccountConfirmGRPCClient", () => {
  beforeAll(async () => {
    process.env.USER_GRPC_HOST = "localhost";

    serverProcess = fork(
      path.resolve(__dirname, "../../microservices/user/grpc/index.js"),
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
      await import("../../microservices/grpc-clients/user/account.creation.request.js"));
    ({ UserCreateAccountConfirmGRPCClient: accountConfirmClient } =
      await import("../../microservices/grpc-clients/user/account.creation.confirm.js"));
  }, 15000);

  beforeEach(async () => {
    mysqlConnection = await Database.getSQLConnection();

    await mysqlConnection.execute(
      "INSERT IGNORE INTO dial_codes (abrv, dial_code, country) VALUES (?, ?, ?)",
      ["ZAR", "27", "South Africa"],
    );
    // Now fetch the id
    const [[dial_code_results]] = await mysqlConnection.execute(
      "SELECT id FROM dial_codes WHERE abrv = ?",
      ["ZAR"],
    );
    dial_code_id = dial_code_results.id;
    // First request to get a verification token
    const requestRes = await accountRequestClient.CreateAccountRequest({
      name: "Test",
      lastname: "User",
      dob: "1990-01-01",
      phone: { code: "+27", body: "1234567890", dial_code_id },
      device_info: JSON.stringify({ device_name: "Vitest" }),
      ip_address: "127.0.0.1",
      fp_hash: "grpc-test-hash",
    });
    console.log(requestRes);
    verificationToken = requestRes.verification_token;
  });

  afterEach(async () => {
    mysqlConnection.release();
  });

  afterAll(() => {
    accountRequestClient?.close();
    accountConfirmClient?.close();
    serverProcess?.kill("SIGTERM");
  });

  it("confirms account creation with valid token and code", async () => {
    // wait briefly for Notification to dump the code
    await new Promise((resolve) => setTimeout(resolve, 200));
    const code = readFileContents(read_code_file_uri);
    console.log({ verificationToken });
    const key = process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY;
    const { payload } = await JWTHelper.decode(verificationToken, key);
    console.log(payload);
    const verified = await argon2.verify(payload.otp_hash, code);
    console.log("verifired: ", { verified });
    const res = await accountConfirmClient.CreateAccountConfirm({
      verification_token: verificationToken,
      code,
    });
    console.log({ res });
    expect(res).toMatchObject({
      success: true,
      refresh_token: expect.any(String),
      access_token: expect.any(String),
      message: "Account created successfully",
    });
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
