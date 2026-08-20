import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
} from "vitest";

import argon2 from "argon2";
import { Database } from "../../../microservices/user/db.js";
import { CredentialsRepository } from "../../../microservices/user/credentials/repository.js";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { promisify } from "util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let childServer;
let client;

describe("User Creation flow tests", () => {
  let mysql_connection;
  let dial_code_id;
  const user_pass = "some strong password!";
  let user_id;

  beforeAll(async () => {
    return new Promise((resolve, reject) => {
      childServer = fork(
        path.resolve(__dirname, "../../../microservices/user/grpc/index.js"),
        [],
        {
          execArgv: ["--import=extensionless/register"],
          env: { ...process.env },
        },
      );

      childServer.on("message", (msg) => {
        if (msg.type === "READY") {
          const packageDef = protoLoader.loadSync(
            path.resolve(__dirname, "../../../microservices/proto/user.proto"),
            {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
            },
          );
          const grpcObj = grpc.loadPackageDefinition(packageDef);
          const CredentialsService = grpcObj.user.CredentialsService;

          client = new CredentialsService(
            `localhost:${msg.port || 50051}`,
            grpc.credentials.createInsecure(),
          );
          resolve();
        }
      });

      childServer.on("error", reject);
      childServer.on("exit", (code) => {
        if (code !== 0) reject(new Error(`Child exited with code ${code}`));
      });
    });
  });

  beforeEach(async () => {
    mysql_connection = await Database.getSQLConnection();

    await mysql_connection.execute(
      `
        INSERT IGNORE INTO dial_codes (abrv, dial_code, country)
        VALUES (?, ?, ?)
      `,
      ["ZAR", "27", "South Africa"],
    );

    const [[dialCode]] = await mysql_connection.execute(
      "SELECT id FROM dial_codes WHERE abrv = ?",
      ["ZAR"],
    );
    dial_code_id = dialCode.id;

    const hashed_pass = await argon2.hash(user_pass);
    user_id = await CredentialsRepository.create(hashed_pass, mysql_connection);

    await CredentialsRepository.linkPhone(
      user_id,
      { dial_code_id, body: `123${user_id}` },
      mysql_connection,
    );
  });

  afterAll(() => {
    client?.close();
    childServer?.kill();
  });

  afterEach(async () => {
    try {
      // Step-by-step cleanup to respect foreign key constraints
      const [[user]] = await mysql_connection.execute(
        "SELECT phone_id FROM user_authentication WHERE id = ?",
        [user_id],
      );

      await mysql_connection.execute(
        "UPDATE user_authentication SET phone_id = NULL WHERE id = ?",
        [user_id],
      );

      if (user?.phone_id) {
        await mysql_connection.execute(
          "DELETE FROM phone_numbers WHERE id = ?",
          [user.phone_id],
        );
      }

      await mysql_connection.execute(
        "DELETE FROM user_authentication WHERE id = ?",
        [user_id],
      );
    } catch (error) {
      console.error("Cleanup error:", error);
    } finally {
      if (typeof mysql_connection.release === "function") {
        mysql_connection.release();
      } else if (typeof mysql_connection.close === "function") {
        await mysql_connection.close();
      }
    }
  });

  it("should log in using grpc", async () => {
    const logInAsync = promisify(client.LogIn.bind(client));

    const response = await logInAsync({
      user_id: String(user_id),
      password: user_pass,
      device_info: JSON.stringify({
        device_name: "Vitest",
        finger_print: "grpc-test-fingerprint",
        ip_address: "127.0.0.1",
      }),
    });
    console.log(response);
    expect(response.success).toBe(true);
    expect(response.refresh_token).toEqual(expect.any(String));
  });
});
