import { RabbitMQ as DefaultRabbitMQ } from "../../rabbitmq";
import ReportProcess from "../../report";

const DeadLetterConsumer = (() => {
  let isRunning = false;
  let run_state = "stopped";
  let heartbeat = Date.now();
  let channel = null;
  let heartbeatTimer = null;

  const DEFAULT_HEALTH_THRESHOLD = 3000;
  const HEARTBEAT_INTERVAL = 1000;

  const touchHeartbeat = (state = run_state) => {
    heartbeat = Date.now();
    run_state = state;
  };

  async function start(RabbitMQInstance = DefaultRabbitMQ) {
    if (isRunning) return;

    isRunning = true;
    touchHeartbeat("starting");

    // Keep heartbeat alive even when queue is idle
    heartbeatTimer = setInterval(() => {
      if (isRunning) {
        heartbeat = Date.now();
      }
    }, HEARTBEAT_INTERVAL);

    try {
      channel = await RabbitMQInstance.getChannel(false);

      if(process.env.ENV!=="test") await channel.assertQueue(process.env.RMQ_DEAD_LETTER_QUEUE, {
        durable: true,
      });

      touchHeartbeat("idle");

      await channel.consume(process.env.RMQ_DEAD_LETTER_QUEUE, async (msg) => {
        if (!msg) return;

        touchHeartbeat("busy");

        try {
          const { job, error } = JSON.parse(msg.content.toString());

          channel.ack(msg);

          await ReportProcess.notify(job, error);

          touchHeartbeat("idle");
        } catch (err) {
          console.error(
            "[DeadLetterConsumer] Error processing message:",
            err,
          );

          touchHeartbeat("error");

          channel.nack(msg, false, false);

          touchHeartbeat("idle");
        }
      });
    } catch (err) {
      console.error(
        "[DeadLetterConsumer] Failed to initialize:",
        err,
      );

      isRunning = false;

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      touchHeartbeat("stopped");
    }
  }

  async function stop() {
    if (!isRunning) return;

    isRunning = false;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    touchHeartbeat("stopping");

    try {
      if (channel) {
        await channel.close();
        channel = null;
      }
    } catch (err) {
      console.error("[DeadLetterConsumer] Error closing channel:", err);
    }

    touchHeartbeat("stopped");
  }

  function checkHealth(threshold = DEFAULT_HEALTH_THRESHOLD) {
    const elapsed = Date.now() - heartbeat;

    return {
      healthy:
        isRunning &&
        run_state !== "error" &&
        run_state !== "stopped" &&
        elapsed < threshold,
      isRunning,
      run_state,
      elapsedMs: elapsed,
    };
  }

  return {
    start,
    stop,
    checkHealth,
  };
})();

process.on("SIGINT", async () => {
  console.log("[DeadLetterConsumer] SIGINT received.");
  await DeadLetterConsumer.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[DeadLetterConsumer] SIGTERM received.");
  await DeadLetterConsumer.stop();
  process.exit(0);
});

export default DeadLetterConsumer;