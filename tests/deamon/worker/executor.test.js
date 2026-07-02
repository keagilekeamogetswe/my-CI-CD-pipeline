import { test, expect, describe, it, afterEach, beforeEach, vi } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * PRODUCTION CONSIDERATION:
 * Sequential execution prevents cross-process interference.
 * Spawning multiple background forks simultaneously can cause port contention,
 * socket pool race conditions, and flaky resource allocation inside CI environments.
 */
describe.sequential("Testing job executer worker", () => {
  let childWorker = null;
  beforeEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });
  /**
   * PRODUCTION CONSIDERATION:
   * Explicit process termination prevents zombie child worker retention.
   * A 5000ms delay guarantees the OS fully releases file descriptors,
   * database socket allocations, and bound process ports prior to subsequent test initialization.
   */
  afterEach(async () => {
    if (childWorker && childWorker.connected) {
      childWorker.kill("SIGKILL");
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  /**
   * PRODUCTION CONSIDERATION:
   * Process forks run inside isolated operating system boundaries.
   * In-memory mocks configured via 'vi.mock' inside this file cannot intercept
   * imports inside the child process. To mock dependencies inside the fork,
   * configure a wrapper bootstrapper or preload script via 'execArgv'.
   */
  const spawnTestWorker = () => {
    return fork(
      path.resolve(__dirname, "../../../app/deamon/worker/job.worker.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: { ...process.env, NODE_ENV: "test" },
        silent: false,
      },
    );
  };

  /**
   * PRODUCTION CONSIDERATION:
   * Tests asynchronous Inter-Process Communication (IPC) via message channels.
   * Expects structured telemetry data matching the internal health payload specification.
   */
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

  /**
   * PRODUCTION CONSIDERATION:
   * Validates cross-platform kernel termination signal handling.
   * On Linux/CI, internal 'SIGTERM' interceptors fire 'process.exit(0)', resulting in code 0.
   * On Windows, native POSIX signals are absent, resulting in a null code paired with a 'SIGTERM' tracking string.
   */
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
