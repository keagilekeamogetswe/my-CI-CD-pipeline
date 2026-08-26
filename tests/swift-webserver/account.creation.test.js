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
import argon2 from "argon2";
import { Database } from "../../microservices/user/db.js";
import { JWTHelper } from "../../microservices/utility/jwt.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = "3002";
const GRPC_PORT = "50051";
const BASE_URL = `http://localhost:${PORT}`;

let grpcServerProcess;
let webServerProcess;
let accountConfirmClient;
let accountRequestClient;
let mysqlConnection;
let dial_code_id;

const read_code_file_uri = path.resolve(
  __dirname,
  "../../tests/.output/code.txt",
);

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

describe("User Account Creation Flow (gRPC & HTTP E2E)", () => {
  beforeAll(async () => {
    // Shared environment variables across all spawned child processes
    process.env.USER_GRPC_HOST = "localhost";
    process.env.GRPC_USER_PORT = GRPC_PORT;
    process.env.USER_GRPC_PORT = GRPC_PORT;

    // 1. Fork gRPC Server
    grpcServerProcess = fork(
      path.resolve(__dirname, "../../microservices/user/grpc/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          TEST_VERIFICATION_DIFF: read_code_file_uri,
          ENV: "test",
        },
        silent: true,
      },
    );

    attachLogger(grpcServerProcess, "gRPC Service");

    await new Promise((resolve, reject) => {
      grpcServerProcess.once(
        "message",
        (msg) => msg?.type === "READY" && resolve(),
      );
      grpcServerProcess.once("error", reject);
      grpcServerProcess.once("exit", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`gRPC server exited with code ${code}`));
        }
      });
    });

    // Import gRPC Clients after gRPC Server is READY
    ({ UserCreateAccountRequestGRPCClient: accountRequestClient } =
      await import("../../microservices/grpc-clients/user/account.creation.request.js"));
    ({ UserCreateAccountConfirmGRPCClient: accountConfirmClient } =
      await import("../../microservices/grpc-clients/user/account.creation.confirm.js"));

    // 2. Fork HTTP Web Server
    webServerProcess = fork(
      path.resolve(__dirname, "../../microservices/swift-webserver/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          PORT,
          ENV: "test",
        },
        silent: true,
      },
    );

    attachLogger(webServerProcess, "Express WebServer");

    await new Promise((resolve, reject) => {
      webServerProcess.once(
        "message",
        (msg) => msg?.type === "READY" && resolve(),
      );
      webServerProcess.once("error", reject);
      webServerProcess.once("exit", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Web server exited with code ${code}`));
        }
      });
    });
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
  });

  afterEach(async () => {
    mysqlConnection?.release();
  });

  afterAll(() => {
    accountRequestClient?.close();
    accountConfirmClient?.close();
    grpcServerProcess?.kill("SIGTERM");
    webServerProcess?.kill("SIGTERM");
  });

  // ---------------------------------------------------------------------------
  // HTTP REST API E2E TESTS
  // ---------------------------------------------------------------------------
  describe("HTTP Web Server Endpoints", () => {
    it("confirms account creation via HTTP endpoints (/api/start)", async () => {
      const requestPayload = {
        name: "Keamogetswe",
        lastname: "Keagile",
        dob: "2003-09-20",
        phone: {
          code: "+27",
          body: "123343245",
          dial_code_id,
        },
        device_info: JSON.stringify({ device_name: "Vitest-HTTP" }),
        ip_address: "127.0.0.1",
        fp_hash: "http-test-hash",
      };

      const request = await fetch(`${BASE_URL}/api/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const resData = await request.json();
      expect(request.status, `Request failed: ${JSON.stringify(resData)}`).toBe(
        200,
      );

      const verificationToken = resData.verification_token;
      expect(verificationToken).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 200));
      const code = readFileContents(read_code_file_uri);
      const confirmReq = await fetch(`${BASE_URL}/api/start/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_token: verificationToken,
          verificationToken: verificationToken,
          code,
        }),
      });

      const confirmRes = await confirmReq.json();

      expect(
        confirmReq.status,
        `Confirm failed: ${JSON.stringify(confirmRes)}`,
      ).toBe(200);
      expect(confirmRes).toMatchObject({
        refresh_token: expect.any(String),
        message: expect.any(String),
      });
    });

    it("rejects HTTP request with missing verification token", async () => {
      const response = await fetch(`${BASE_URL}/api/start/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_token: "",
          verificationToken: "",
          code: "123456",
        }),
      });

      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("errors");
    });
  });

  // ---------------------------------------------------------------------------
  // HYBRID CROSS-LAYER TEST
  // ---------------------------------------------------------------------------
  describe("Cross-Layer Integration", () => {
    it("requests token via gRPC client and completes verification via HTTP endpoint", async () => {
      process.env.USER_GRPC_HOST = "localhost";
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 200);
      });
      const requestRes = await accountRequestClient.CreateAccountRequest({
        name: "Hybrid",
        lastname: "User",
        dob: "1995-05-05",
        phone: { code: "+27", body: "9876543210", dial_code_id },
        device_info: JSON.stringify({ device_name: "Vitest-Hybrid" }),
        ip_address: "127.0.0.1",
        fp_hash: "hybrid-test-hash",
      });

      const verificationToken = requestRes.verification_token;

      await new Promise((resolve) => setTimeout(resolve, 200));
      const code = readFileContents(read_code_file_uri);

      const confirmReq = await fetch(`${BASE_URL}/api/start/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_token: verificationToken,
          verificationToken: verificationToken,
          code,
        }),
      });
      const confirmRes = await confirmReq.json();
      console.log({ confirmRes });

      expect(
        confirmReq.status,
        `Hybrid confirm failed: ${JSON.stringify(confirmRes)}`,
      ).toBe(200);
      expect(confirmRes).toMatchObject({
        refresh_token: expect.any(String),
        message: expect.any(String),
      });
    });
  });
  // Rejects when verification code is missing/empty
  it("rejects HTTP request with missing verification code", async () => {
    const response = await fetch(`${BASE_URL}/api/start/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_token: "dummy-token-string",
        code: "",
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("errors");
  });

  // Rejects when an incorrect/invalid verification code is submitted
  it("rejects HTTP request with invalid verification code", async () => {
    // Generate a real token via gRPC to test against bad OTP verification
    const requestRes = await accountRequestClient.CreateAccountRequest({
      name: "InvalidCode",
      lastname: "Test",
      dob: "1995-05-05",
      phone: { code: "+27", body: "9876543211", dial_code_id },
      device_info: JSON.stringify({ device_name: "Vitest-InvalidCode" }),
      ip_address: "127.0.0.1",
      fp_hash: "invalid-code-hash",
    });

    const verificationToken = requestRes.verification_token;

    const response = await fetch(`${BASE_URL}/api/start/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_token: verificationToken,
        code: "000000", // incorrect OTP code
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: expect.any(String),
    });
  });
});
