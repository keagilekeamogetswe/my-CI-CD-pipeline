import { RabbitMQ as DefaultRabbitMQ } from "./../../rabbitmq";
import ReportProcess from "./../../report";

const DeadLetterConsumer = (() => {
  let isRunning = false;
  let run_state = "stopped";
  let heartbeat = Date.now();
  let channel = null;
  const default_health_threshold = 3000;

  const touchHeartbeat = (state) => {
    heartbeat = Date.now();
    run_state = state;
  };

  async function start(RabbitMQInstance = DefaultRabbitMQ) {
    if (isRunning) return;
    isRunning = true;
    touchHeartbeat("idle");

    try {
      channel = await RabbitMQInstance.getChannel(false);

      await channel.consume(process.env.RMQ_DEAD_LETTER_QUEUE, async (msg) => {
        if (!msg) return;
        touchHeartbeat("busy");

        try {
          const { job, error } = JSON.parse(msg.content.toString());

          // Acknowledge message
          channel.ack(msg);

          // Notify/report the failed job
          await ReportProcess.notify(job, error);

          touchHeartbeat("idle");
        } catch (err) {
          touchHeartbeat("error");
          console.error(
            "[DeadLetterConsumer] Error processing DLQ message:",
            err,
          );

          // Negative ack discards or requeues depending on broker config
          channel.nack(msg, false, false);
          touchHeartbeat("idle");
        }
      });
    } catch (connectionError) {
      touchHeartbeat("error");
      console.error(
        "[DeadLetterConsumer] Failed to initialize:",
        connectionError,
      );
      isRunning = false;
      touchHeartbeat("stopped");
    }
  }

  async function stop() {
    if (!isRunning) return;
    touchHeartbeat("stopping");
    isRunning = false;

    try {
      if (channel) {
        await channel.close();
        channel = null;
      }
    } catch (closeError) {
      console.error("[DeadLetterConsumer] Error closing channel:", closeError);
    } finally {
      touchHeartbeat("stopped");
    }
  }

  function checkHealth(customThresholdMs = default_health_threshold) {
    const elapsed = Date.now() - heartbeat;
    return {
      healthy: isRunning && elapsed < customThresholdMs,
      isRunning,
      run_state,
      elapsedMs: elapsed,
    };
  }

  return { start, stop, checkHealth };
})();

// Handle process signals for clean shutdown
process.on("SIGINT", async () => {
  console.log("[DeadLetterConsumer] SIGINT received, shutting down...");
  await DeadLetterConsumer.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[DeadLetterConsumer] SIGTERM received, shutting down...");
  await DeadLetterConsumer.stop();
  process.exit(0);
});

export default DeadLetterConsumer;
