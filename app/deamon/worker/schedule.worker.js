import { RabbitMQ } from "../rabbitmq.js";
import Scheduler from "../scheduler.js";
import ScheduleConsumer from "./modules/schedule.consumer.js";

console.log("Starting Schedule Consumer Worker...");

// 1. REGISTER LISTENERS FIRST
// This ensures Node.js registers the IPC channels immediately before any blocking logic fires
process.on("message", (message) => {
  if (message === "GET_HEALTH") {
    // Apply a fast 100ms threshold during tests to prevent long-running timeouts
    const threshold = process.env.ENV === "test" && 100;
    let health;
    if (threshold) health = ScheduleConsumer.checkHealth(threshold);
    else health = ScheduleConsumer.checkHealth();
    process.send({ type: "HEALTH_REPORT", data: health });
  }
});

process.on("SIGTERM", async () => {
  console.log(
    "[Schedule Worker] Received SIGTERM. Shutting down consumer channel cleanly...",
  );
  await ScheduleConsumer.stop();
  process.exit(0);
});

// 2. KICK OFF THE STREAMING LISTENER AT THE VERY BOTTOM WITH MOCKED INJECTIONS
if (process.env.NODE_ENV === "test") {
  /**
   * PRODUCTION CONSIDERATION:
   * Passing mock objects directly to the execution starter bypasses raw socket initialization.
   * This completely prevents the worker from establishing real AMQP TCP connection handshakes
   * or waiting for a running RabbitMQ instance during isolated CI pipelines.
   */
  const fakeRabbitMQ = {
    getChannel: async () => ({
      consume: async (queue, callback) => {
        console.log(
          `[Test Mock] Subscribed to queue: ${queue}. Simulating idle state.`,
        );
        // Returns immediately without firing the callback to mimic an empty, quiet queue
        return { consumerTag: "mock-tag" };
      },
      ack: () => {},
      nack: () => {},
      close: async () =>
        console.log("[Test Mock] Mock channel closed cleanly."),
    }),
  };

  const fakeScheduler = {
    recompute: async (msgStr) => ({ id: "mock-job", raw: msgStr }),
    consumer_logic: async () => {},
  };

  // Launch using isolated non-blocking test stubs
  ScheduleConsumer.start(fakeRabbitMQ, fakeScheduler);
} else {
  // Launch using live production broker connections and business logic engines
  ScheduleConsumer.start(RabbitMQ, Scheduler);
}
