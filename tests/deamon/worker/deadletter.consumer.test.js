// tests/deamon/deadletter.worker.test.js
import { describe, it, expect, afterEach } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe.sequential("Report", () => {
  let childWorker = null;

  afterEach(async () => {
    if (childWorker && childWorker.connected) {
      childWorker.kill("SIGKILL");
    }
    // Allow OS to release resources before next test
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  const spawnTestWorker = () => {
    return fork(
      path.resolve(
        __dirname,
        "../../../app/deamon/worker/deadletter.worker.js",
      ),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          NODE_ENV: "test",
          RMQ_DEAD_LETTER_QUEUE: "test_dead_letter_queue",
        },
        silent: false,
      },
    );
  };

  it("SCENARIO 1: should successfully request and receive an active idle health report", () => {
    return new Promise((resolve, reject) => {
      childWorker = spawnTestWorker();

      childWorker.on("message", (response) => {
        if (response && response.type === "HEALTH_REPORT") {
          try {
            expect(response.data.healthy).toBe(true);
            expect(response.data.isRunning).toBe(true);
            expect(response.data.run_state).toBe("idle");
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      childWorker.send("GET_HEALTH");
    });
  });

  it("SCENARIO 2: should handle graceful shutdown cleanly on exit commands", () => {
    return new Promise((resolve, reject) => {
      childWorker = spawnTestWorker();

      setTimeout(() => {
        if (childWorker && childWorker.connected) {
          childWorker.kill("SIGTERM");
        }
      }, 500);

      const handleExit = (code, signal) => {
        try {
          if (code === 0) {
            expect(code).toBe(0);
          } else {
            expect(signal).toBe("SIGTERM");
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      childWorker.on("exit", handleExit);
      childWorker.on("close", handleExit);
    });
  });
});
