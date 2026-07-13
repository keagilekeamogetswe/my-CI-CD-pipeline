// tests/deamon/jobs.grpc.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let childServer;
let client;

describe.sequential("Report: JobService gRPC (child process)", () => {
  beforeAll(() => {
    return new Promise((resolve, reject) => {
      childServer = fork(
        path.resolve(__dirname, "../../../app/deamon/grpc.js"), // adjust path
        [],
        {
          execArgv: ["--import=extensionless/register"],
          env: { ...process.env, NODE_ENV: "test" },
        },
      );

      // Expect the server to send READY message after bind/start
      childServer.on("message", (msg) => {
        if (msg.type === "READY") {
          // Load proto and create client
          const packageDef = protoLoader.loadSync(
            path.resolve(__dirname, "../../../app/proto/deamon.proto"),
            {},
          );
          const grpcObj = grpc.loadPackageDefinition(packageDef);
          const JobService = grpcObj.jobs.JobService;

          client = new JobService(
            "localhost:50051",
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

  afterAll(() => {
    if (childServer) childServer.kill("SIGKILL");
  });

  it("should insert a job and return queued status", () => {
    return new Promise((resolve, reject) => {
      client.AddJob(
        { type: "session.save", payload: JSON.stringify({ foo: "bar" }) },
        (err, response) => {
          if (err) return reject(err);
          try {
            expect(response.status).toBe("queued");
            expect(response.id).toBeDefined();
            resolve();
          } catch (assertErr) {
            reject(assertErr);
          }
        },
      );
    });
  });
});
