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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let serverProcess;
let accountRequestClient;
let mysqlConnection;

describe("UserCreateAccountRequestGRPCClient", () => {
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

    ({ UserCreateAccountRequestGRPCClient: accountRequestClient } =
      await import("../../microservices/grpc-clients/user/account.creation.request.js"));
  }, 15000);

  beforeEach(async () => {
    mysqlConnection = await Database.getSQLConnection();
    await mysqlConnection.execute(
      "INSERT IGNORE INTO dial_codes (abrv, dial_code, country) VALUES (?, ?, ?)",
      ["ZAR", "27", "South Africa"],
    );
  });

  afterEach(async () => {
    mysqlConnection.release();
  });

  afterAll(() => {
    accountRequestClient?.close();
    serverProcess?.kill("SIGTERM");
  });

  it("requests account creation through the gRPC server", async () => {
    await expect(
      accountRequestClient.CreateAccountRequest({
        name: "Test",
        lastname: "User",
        dob: "1990-01-01",
        phone: { code: "+27", body: "1234567890", dial_code_id: 27 },
        device_info: JSON.stringify({ device_name: "Vitest" }),
        ip_address: "127.0.0.1",
        fp_hash: "grpc-test-hash",
      }),
    ).resolves.toMatchObject({
      success: true,
      verification_token: expect.any(String),
    });
  });
});
