import JobProcessor from "../../processor.js";
import Scheduler from "../../scheduler.js";

const RealtimeJobExecuter = (() => {
  // Internal module state flags tracking the daemon event loop lifecycle
  let isRunning = false;
  let run_state = "stopped";
  let heartbeat = Date.now();
  let default_heartbeat_timeout_ms = 30000;

  /**
   * Updates telemetry variables synchronously across state transitions.
   * Ensures the health checker has access to exact millisecond tracking data.
   * @param {string} state - The current operational state ("idle" | "busy" | "error" | "stopping" | "stopped")
   */
  const touchHeartbeat = (state) => {
    heartbeat = Date.now();
    run_state = state;
  };

  /**
   * Handles a single execution cycle: claiming, running, and conditionally rescheduling a job.
   * @param {Object} processInstance - Interface handle for job persistence operations
   * @param {Object} schedulerInstance - Interface handle for job scheduling logic
   * @returns {Promise<boolean|null>} true on execution success, false on reschedule, null on queue empty or fatal failure
   */
  async function processJob(
    processInstance = JobProcessor,
    schedulerInstance = Scheduler,
  ) {
    touchHeartbeat("idle");

    // Attempt to acquire an available job with a database write-lock
    const job_claimed = await processInstance.claim_job();
    if (!job_claimed) {
      return null;
    }

    touchHeartbeat("busy");

    // Execute the core business logic associated with the job type
    const result = await processInstance.run_job(job_claimed);
    if (result && result.success) {
      return true;
    }

    // Job execution failed: compute next iteration context and hand over to the Scheduler
    try {
      const computed_job = schedulerInstance.compute(job_claimed);
      await schedulerInstance.schedule_job(computed_job);
      return false;
    } catch (error) {
      touchHeartbeat("error");
      console.error(
        `[Reschedule Failure] Scheduler threw an error for Job ID ${job_claimed?.id}:`,
        error,
      );

      // Fallback routine: if the scheduler crashes, release the job lock to prevent data truncation or orphan states
      try {
        await processInstance.release_job(job_claimed);
      } catch (releaseError) {
        console.error(
          `[CRITICAL] Database failed to release Job ID ${job_claimed?.id}:`,
          releaseError,
        );
      }
      return null;
    }
  }

  /**
   * Utility helper wrapping setTimeout into a Promise for non-blocking asynchronous pacing.
   * @param {number} ms - Milliseconds to delay execution
   */
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  return {
    /**
     * Production health validation endpoint targeted by orchestration probes.
     * Supports a custom threshold argument to facilitate fast automated unit testing without clock delays.
     * @param {number} customThresholdMs - Maximum allowed duration in milliseconds between loop cycles before declaring a deadlock
     * @returns {Object} Metric payload representing daemon health status
     */
    checkHealth: () => {
      const now = Date.now();
      const elapsed = now - heartbeat;

      return {
        healthy: isRunning && elapsed < default_heartbeat_timeout_ms,
        isRunning,
        run_state,
        elapsedMs: elapsed,
      };
    },

    /**
     * Initializes and maintains the main infinite loop processing block.
     * Accepts dependency parameters to enable runtime stub/mock configuration during isolated test runs.
     */
    start: async (
      processInstance = JobProcessor,
      schedulerInstance = Scheduler,
    ) => {
      if (isRunning) return;
      isRunning = true;
      touchHeartbeat("idle");

      while (isRunning) {
        const processed = await processJob(processInstance, schedulerInstance);

        // Reset state mapping dynamically depending on whether a shutdown command was intercepted mid-cycle
        touchHeartbeat(isRunning ? "idle" : "stopped");

        // Loop pacing governance to throttle CPU consumption under variable load states
        if (processed === null) {
          await sleep(1000); // Back off to preserve connection pools when the database queue is exhausted
        } else {
          await sleep(10); // Yield the primary execution thread briefly to process incoming network or IPC events
        }
      }

      touchHeartbeat("stopped");
    },

    /**
     * Signals the infinite execution loop to stop gracefully.
     * Active jobs in mid-execution are permitted to finish completely before the worker process halts.
     */
    stop: async () => {
      touchHeartbeat("stopping");
      isRunning = false;
    },
  };
})();

export default RealtimeJobExecuter;
