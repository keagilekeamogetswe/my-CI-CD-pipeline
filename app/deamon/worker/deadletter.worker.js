import { RabbitMQ } from "../rabbitmq.js";
import DeadLetterConsumer from "./modules/deadletter.consumer.js";

console.log("Starting Dead Letter Consumer Worker...");

// 1. REGISTER LISTENERS FIRST
// This ensures Node.js registers IPC channels immediately before any blocking logic fires
process.on("message", (message) => {
  if (message === "GET_HEALTH") {
    // Apply a fast 100ms threshold during tests to prevent long-running timeouts
    const threshold = process.env.ENV === "test" && 100;
    let health;
    if (threshold) health = DeadLetterConsumer.checkHealth(threshold);
    else health = DeadLetterConsumer.checkHealth();
    process.send({ type: "HEALTH_REPORT", data: health });
  }
});

process.on("SIGTERM", async () => {
  console.log(
    "[DeadLetter Worker] Received SIGTERM. Shutting down consumer channel cleanly...",
  );
  await DeadLetterConsumer.stop();
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
          `[Test Mock] Subscribed to DLQ: ${queue}. Simulating idle state.`,
        );
        // Returns immediately without firing the callback to mimic an empty, quiet queue
        return { consumerTag: "mock-tag" };
      },
      ack: () => {},
      nack: () => {},
      close: async () =>
        console.log("[Test Mock] Mock DLQ channel closed cleanly."),
    }),
  };

  // Launch using isolated non-blocking test stubs
  DeadLetterConsumer.start(fakeRabbitMQ);
} else {
  // Launch using live production broker connections
  DeadLetterConsumer.start(RabbitMQ);
}
