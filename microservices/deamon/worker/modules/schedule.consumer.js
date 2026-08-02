import { RabbitMQ as DefaultRabbitMQ } from "../../rabbitmq";
import DefaultScheduler from "../../scheduler";

const ScheduleConsumer = (() => {
  let isRunning = false;
  let run_state = "stopped";
  let heartbeat = Date.now();
  let dynamicChannel = null;
  let default_health_threshold = 3000;
  let heartbeatInterval = null;

  const touchHeartbeat = (state) => {
    heartbeat = Date.now();
    run_state = state;
  };

  return {
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

    start: async (
      RabbitMQInstance = DefaultRabbitMQ,
      SchedulerInstance = DefaultScheduler,
    ) => {
      if (isRunning) return;
      isRunning = true;
      touchHeartbeat("idle");

      // keep heartbeat alive while running
      heartbeatInterval = setInterval(() => {
        if (isRunning) touchHeartbeat(run_state);
      }, 1000);

      try {
        const delay_mode = true;
        dynamicChannel = await RabbitMQInstance.getChannel(delay_mode);

        await dynamicChannel.consume(
          process.env.RMQ_DELAYED_QUEUE,
          async (msg) => {
            if (!msg) return;

            touchHeartbeat("busy");

            try {
              const computed_job = await SchedulerInstance.recompute(
                msg.content.toString(),
              );
              await SchedulerInstance.consumer_logic(computed_job);

              dynamicChannel.ack(msg);
              touchHeartbeat("idle");
            } catch (processingError) {
              touchHeartbeat("error");
              console.error(
                "[Consumer Processing Failure] Error resolving message context:",
                processingError,
              );
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

    stop: async () => {
      if (!isRunning) return;
      touchHeartbeat("stopping");
      isRunning = false;

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      try {
        if (dynamicChannel) {
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

process.on("SIGINT", async () => {
  console.log(
    "[ScheduleConsumer] Intercepted SIGINT. Initiating clean termination sequence...",
  );
  await ScheduleConsumer.stop();
  process.exit(0);
});

export default ScheduleConsumer;
