import JobProcessor from "../processor.js";
import Scheduler from "../scheduler.js";
import RealtimeJobExecuter from "./modules/executer.js";

// 1. REGISTER LISTENERS FIRST
// This ensures Node.js knows how to answer IPC signals immediately upon bootup
process.on("message", (message) => {
  if (message === "GET_HEALTH") {
    // Apply a fast 100ms threshold during tests to prevent long-running timeouts
    const threshold = process.env.NODE_ENV === "test" ? 100 : 30000;
    const health = RealtimeJobExecuter.checkHealth(threshold);
    process.send({ type: "HEALTH_REPORT", data: health });
  }
});

process.on("SIGTERM", async () => {
  console.log("[Child Worker] Received SIGTERM. Shutting down daemon loop...");
  await RealtimeJobExecuter.stop();
  process.exit(0);
});

// 2. KICK OFF THE BLOCKING LOOP AT THE VERY BOTTOM WITH MOCKED INJECTIONS
if (process.env.NODE_ENV === "test") {
  /**
   * PRODUCTION CONSIDERATION:
   * Passing mock objects directly to the execution starter bypasses raw file imports.
   * This completely prevents the worker from initializing connection pools or hitting
   * live MySQL databases inside isolated CI pipelines.
   * Preventing Database deadlock of zombie children
   */
  const fakeProcessor = {
    claim_job: async () => null, // Returns null instantly to let the loop execute its sleep(1000) cycle safely
    run_job: async () => ({ success: true }),
    release_job: async () => true,
  };

  const fakeScheduler = {
    compute: (job) => job,
    schedule_job: async () => ({ success: true }),
  };

  // Launch using test stubs
  RealtimeJobExecuter.start(fakeProcessor, fakeScheduler);
} else {
  // Launch using real production database components
  RealtimeJobExecuter.start(JobProcessor, Scheduler);
}
