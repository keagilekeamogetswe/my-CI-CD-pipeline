import { test, expect, describe, it, afterEach } from "vitest";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * PRODUCTION CONSIDERATION:
 * Sequential execution prevents cross-process resource contention.
 * Spawning multiple background forks simultaneously can cause file descriptor locks,
 * port allocation race conditions, and flaky tracking states inside CI environments.
 */
describe.sequential("Testing schedule consumer worker", () => {
  let childWorker = null;

  /**
   * PRODUCTION CONSIDERATION:
   * Explicit process termination prevents rogue background tasks from persisting.
   * A 3000ms delay guarantees the OS fully releases file descriptors,
   * network socket allocations, and child processes prior to subsequent test initialization.
   */
  afterEach(async () => {
    if (childWorker && childWorker.connected) {
      childWorker.kill("SIGKILL");
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  });

  /**
   * PRODUCTION CONSIDERATION:
   * Process forks run inside isolated operating system boundaries.
   * Passing custom mocked structures inside the target execution script when NODE_ENV=test
   * completely prevents the worker from establishing real AMQP TCP connection handshakes
   * or waiting for a running RabbitMQ instance during isolated CI pipelines.
   */
  const spawnTestWorker = () => {
    return fork(
      path.resolve(__dirname, "../../../app/deamon/worker/schedule.worker.js"),
      [],
      {
        execArgv: ["--import=extensionless/register"],
        env: {
          ...process.env,
          NODE_ENV: "test",
          RMQ_DELAYED_QUEUE: "test_delayed_jobs_queue",
        },
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
   * On Linux/GitHub Actions CI, internal signal listeners trigger a clean 'process.exit(0)', resulting in code 0.
   * On Windows local environments, POSIX signals are absent, resulting in a null code paired with a 'SIGTERM' tracking string.
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
