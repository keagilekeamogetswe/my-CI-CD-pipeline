import amqp from "amqplib";

let connection = null;
let channel = null;

const options =
  process.env.ENV !== "test"
    ? {
        protocol: "amqp",
        hostname: process.env.RMQ_HOST,
        port: Number(process.env.RMQ_PORT),
        username: process.env.RMQ_USER,
        password: process.env.RMQ_PASS,
        heartbeat: 60,
      }
    : {
        protocol: "amqp",
        hostname: process.env.RMQ_HOST,
        port: Number(process.env.RMQ_PORT),
      };

export const RabbitMQ = {
  getChannel: async (delayMode = true) => {
    if (!connection) {
      connection = await amqp.connect(options);

      connection.on("close", () => {
        console.log("[RabbitMQ] Connection closed");
        connection = null;
        channel = null;
      });

      connection.on("error", (err) => {
        console.error("[RabbitMQ] Connection error:", err);
      });
    }

    if (!channel) {
      channel = await connection.createChannel();

      if (delayMode) {
        const exchange = process.env.RMQ_DELAYED_EXCHANGE;
        const queue = process.env.RMQ_DELAYED_QUEUE;
        const routingKey = process.env.RMQ_DELAYED_QUEUE;

        await channel.assertExchange(exchange, "x-delayed-message", {
          durable: true,
          arguments: {
            "x-delayed-type": "direct",
          },
        });

        await channel.assertQueue(queue, {
          durable: true,
        });

        await channel.bindQueue(queue, exchange, routingKey);
      }
    }

    return channel;
  },

  checkConnection: async () => {
    let probeConnection = null;
    let probeChannel = null;

    try {
      probeConnection = await amqp.connect(options);
      probeChannel = await probeConnection.createChannel();

      return {
        status: "connected",
      };
    } catch (err) {
      console.error("[RabbitMQ Health]", err);

      return {
        status: "unreachable",
        error: err.message,
      };
    } finally {
      try {
        if (probeChannel) {
          await probeChannel.close();
        }
      } catch (_) {}

      try {
        if (probeConnection) {
          await probeConnection.close();
        }
      } catch (_) {}
    }
  },

  closeConnections: async () => {
    try {
      if (channel) {
        await channel.close();
      }
    } catch (err) {
      console.error("[RabbitMQ] Error closing channel:", err.message);
    } finally {
      channel = null;
    }

    try {
      if (connection) {
        await connection.close();
      }
    } catch (err) {
      console.error("[RabbitMQ] Error closing connection:", err.message);
    } finally {
      connection = null;
    }
  },
};