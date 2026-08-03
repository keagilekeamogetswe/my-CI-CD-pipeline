// tests/deamon/deadletter.health.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let childServer;

describe.sequential("Report: DeadLetter Health Server", () => {
  beforeAll(() => {
    return new Promise((resolve, reject) => {
      childServer = fork(
        path.resolve(
          __dirname,
          "../../../../microservices/deamon/worker/healthcheck/deadletter.health.server.js",
        ),
        [],
        {
          execArgv: ["--import=extensionless/register"],
          env: {
            ...process.env,
            HEALTH_PORT: "3000",
            WORKER_HEALTH_THRESHOLD: 100,
          },
        },
      );

      childServer.on("message", (msg) => {
        if (msg.type === "READY") resolve();
      });

      childServer.on("error", reject);
    });
  });

  afterAll(() => {
    if (childServer && childServer.connected) {
      childServer.kill("SIGKILL");
    }
  });

  it("SCENARIO 1: should return healthy report from /health", async () => {
    const res = await fetch("http://localhost:3000/health");
    const data = await res.json();
    console.log("res", data);

    expect(res.status).toBe(200);
    expect(data.worker.isRunning).toBe(true);
    expect(data.worker.healthy).toBe(true);
    expect(data.worker.run_state).toBe("idle");
  });

});
