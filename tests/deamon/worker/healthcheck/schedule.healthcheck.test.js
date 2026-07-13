// tests/deamon/worker/healthcheck/schedule.worker.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let childServer;
let PORT;

describe.sequential("Report: Schedule Worker Health Server", () => {
  beforeAll(() => {
    PORT = 3002;
    return new Promise((resolve, reject) => {
      childServer = fork(
        path.resolve(
          __dirname,
          "../../../../app/deamon/worker/healthcheck/schedule.worker.health.server.js",
        ),
        [],
        {
          execArgv: ["--import=extensionless/register"],
          env: {
            ...process.env,
            NODE_ENV: "test",
            HEALTH_PORT: String(PORT),
            WORKER_HEALTH_THRESHOLD: 100,
          },
        },
      );

      childServer.on("message", (msg) => {
        if (msg.type === "READY") {
          // give the server a moment to bind
          setTimeout(resolve, 200);
        }
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
    const res = await fetch(`http://localhost:${PORT}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isRunning).toBe(true);
    expect(data.healthy).toBe(true);
    expect(data.run_state).toBe("idle");
  });

  // Optional unhealthy scenario if you add simulateUnhealthy IPC
  // it("SCENARIO 2: should report unhealthy if worker unresponsive", async () => {
  //   childServer.send("SIMULATE_UNHEALTHY");
  //   const res = await fetch(`http://localhost:${PORT}/health`);
  //   const data = await res.json();
  //   expect(res.status).toBe(500);
  //   expect(data.healthy).toBe(false);
  // });
});
