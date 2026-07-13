import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let childServer;

describe.sequential("Report: Job Worker Health Server", async () => {
  beforeAll(async () => {
    return new Promise((resolve, reject) => {
      childServer = fork(
        path.resolve(
          __dirname,
          "../../../../app/deamon/worker/healthcheck/job.worker.health.server.js",
        ), // adjust path
        [],
        {
          execArgv: ["--import=extensionless/register"],

          env: {
            ...process.env,
            WORKER_HEALTH_THRESHOLD: 100,
            HEALTH_PORT: "3001",
          },
        },
      );

      childServer.on("message", (msg) => {
        if (msg.type === "READY") resolve();
      });

      childServer.on("error", reject);
      childServer.on("exit", (code) => {
        if (code !== 0) reject(new Error(`Child exited with code ${code}`));
      });
    });
  }, 30000);

  afterAll(() => {
    if (childServer) childServer.kill("SIGKILL");
  });

  it("SCENARIO 1: should return healthy report from /health", async () => {
    const res = await fetch("http://localhost:3001/health");
    const data = await res.json();
    console.log("response: ", data);

    expect(res.status).toBe(200);
    expect(data.healthy).toBe(true);
  });
});
