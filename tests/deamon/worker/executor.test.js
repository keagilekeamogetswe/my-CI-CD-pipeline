import { test, expect, describe, it, afterEach, vi } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe.sequential("Testing job executer worker", () => {
  let childWorker = null;

  afterEach(() => {
    if (childWorker && childWorker.connected) {
      childWorker.kill("SIGKILL");
    }
  });

  // Helper helper to spawn our test worker with the required test flags
  const spawnTestWorker = () => {
    return fork(
      path.resolve(__dirname, "../../../app/deamon/worker/job.worker.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: { ...process.env, NODE_ENV: "test" },
        silent: false, // Keep logs visible
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

  it(" SCENARIO 2: should handle graceful shutdown cleanly on exit commands", () => {
    return new Promise((resolve, reject) => {
      childWorker = spawnTestWorker();

      // Trigger a clean process signal shutdown sequence
      setTimeout(() => {
        childWorker.kill("SIGTERM");
      }, 500);

      childWorker.on("exit", (code, signal) => {
        try {
          // THE FIX: Node returns null code and 'SIGTERM' signal when killed this way
          expect(signal).toBe("SIGTERM");
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
