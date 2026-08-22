import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

vi.mock("../../../microservices/utility/notifications", () => ({
  Notification: {
    Email: { send: vi.fn().mockResolvedValue(true) },
    SMS: { send: vi.fn().mockResolvedValue(true) },
  },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let childServer;
let client;

describe("AccountCreation gRPC tests", () => {
  beforeAll(async () => {
    childServer = fork(
      path.resolve(__dirname, "../../../microservices/user/grpc/index.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: { ...process.env, GRPC_USER_PORT: "50052" },
        silent: false,
      },
    );

    await new Promise((resolve, reject) => {
      childServer.once("message", (message) => {
        if (message.type === "READY") {
          const packageDef = protoLoader.loadSync(
            path.resolve(__dirname, "../../../microservices/proto/user.proto"),
            { keepCase: true, defaults: true },
          );
          const grpcObj = grpc.loadPackageDefinition(packageDef);
          const Service = grpcObj.user.AccountCreation;

          client = new Service(
            "localhost:50052",
            grpc.credentials.createInsecure(),
          );
          resolve();
        }
      });
      childServer.once("error", reject);
      childServer.once("exit", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Child exited with code ${code}`));
        }
      });
    });
  }, 15000);

  afterAll(() => {
    client?.close();
    childServer?.kill("SIGTERM");
  });

  it("handles an account verification request through the forked gRPC server", async () => {
    const response = await new Promise((resolve, reject) => {
      client.CreateAccountRequest(
        {
          name: "John",
          lastname: "Emori",
          dob: "2003-09-20",
          phone: { code: "27", body: "123456789", dial_code_id: 1 },
          device_info: "Vitest device",
          ip_address: "127.0.0.1",
          fp_hash: "grpc-test-fingerprint",
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
    });
    console.log({ response });
    expect(response.success).toBe(true);
    expect(response.message).toBe("Account verification requested");
  });

  it("handles account confirmation through the forked gRPC server", async () => {
    const response = await new Promise((resolve, reject) => {
      client.CreateAccountConfirm(
        {
          verification_token: "invalid-verification-token",
          code: "123456",
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
    });

    expect(response.success).toBe(false);
    expect(response.message).toEqual(expect.any(String));
  });
});
