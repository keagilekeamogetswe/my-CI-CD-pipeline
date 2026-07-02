import { RabbitMQ as DefaultRabbitMQ } from "../../rabbitmq";
import DefaultScheduler from "../../scheduler";

const ScheduleConsumer = (() => {
  // Internal execution state flags tracking consumer lifecycle
  let isRunning = false;
  let run_state = "stopped";
  let heartbeat = Date.now();
  let dynamicChannel = null;
  let default_health_threshold = 3000;

  /**
   * Updates telemetry variables synchronously across state transitions.
   * Ensures orchestration health interfaces see immediate update metrics.
   * @param {string} state - The active operational state ("idle" | "busy" | "error" | "stopping" | "stopped")
   */
  const touchHeartbeat = (state) => {
    heartbeat = Date.now();
    run_state = state;
  };

  return {
    /**
     * Production health validation endpoint targeted by orchestration probes.
     * Supports a custom threshold argument to facilitate fast automated unit testing without clock delays.
     * @param {number} customThresholdMs - Maximum allowed duration in milliseconds between loop cycles before declaring a deadlock
     * @returns {Object} Metric payload representing daemon health status
     */
    checkHealth: (customThresholdMs = default_health_threshold) => {
      const now = Date.now();
      const elapsed = now - heartbeat;

      return {
        healthy: isRunning && elapsed < customThresholdMs,
        isRunning,
        run_state,
        elapsedMs: elapsed,
      };
    },

    /**
     * Initializes the connection pool and hooks up the RabbitMQ event streaming listener.
     * Accepts dependency parameters to enable runtime stub/mock configuration during isolated test runs.
     */
    start: async (
      RabbitMQInstance = DefaultRabbitMQ,
      SchedulerInstance = DefaultScheduler,
    ) => {
      if (isRunning) return;
      isRunning = true;
      touchHeartbeat("idle");

      try {
        const delay_mode = true;
        // Resolved inside the async lifecycle method to prevent top-level closure locking
        dynamicChannel = await RabbitMQInstance.getChannel(delay_mode);

        await dynamicChannel.consume(
          process.env.RMQ_DELAYED_QUEUE,
          async (msg) => {
            if (!msg) return; // Guard clause managing edge cases where RabbitMQ emits empty consumer signals

            touchHeartbeat("busy");

            try {
              // Transform raw stream bytes into a structural job transaction object
              const computed_job = await SchedulerInstance.recompute(
                msg.content.toString(),
              );
              await SchedulerInstance.consumer_logic(computed_job);

              // Explicit acknowledgment confirms clean processing down to the broker cluster
              dynamicChannel.ack(msg);
              touchHeartbeat("idle");
            } catch (processingError) {
              touchHeartbeat("error");
              console.error(
                "[Consumer Processing Failure] Error resolving message context:",
                processingError,
              );

              /**
               * PRODUCTION CONSIDERATION:
               * Negative acknowledgment ensures corrupted or unresolvable messages
               * are rejected. Change requeue to 'true' if transient networking issues
               * require the broker to retry, or leave as 'false' to route straight to a Dead Letter Queue (DLQ).
               */
              dynamicChannel.nack(msg, false, false);
              touchHeartbeat("idle");
            }
          },
        );
      } catch (connectionError) {
        touchHeartbeat("error");
        console.error(
          "[Consumer Initialization Error] Failed to secure RabbitMQ channel handles:",
          connectionError,
        );
        isRunning = false;
        touchHeartbeat("stopped");
      }
    },

    /**
     * Signals the streaming pipeline to stop gracefully.
     * Revokes active AMQP channel registration hooks before shutting down entirely.
     */
    stop: async () => {
      if (!isRunning) return;
      touchHeartbeat("stopping");
      isRunning = false;

      try {
        if (dynamicChannel) {
          // Explicit close command forces RabbitMQ to gracefully release server connection loops immediately
          await dynamicChannel.close();
        }
      } catch (closeError) {
        console.error(
          "[Consumer Teardown Error] Failure freeing active broker channels:",
          closeError,
        );
      } finally {
        touchHeartbeat("stopped");
      }
    },
  };
})();

// Process system intercept signals for clean deployment updates inside Kubernetes pods
process.on("SIGINT", async () => {
  console.log(
    "[ScheduleConsumer] Intercepted SIGINT. Initiating clean termination sequence...",
  );
  await ScheduleConsumer.stop();
  process.exit(0);
});

export default ScheduleConsumer;
