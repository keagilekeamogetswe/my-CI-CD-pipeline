// app/deamon/rabbitmq.js
import amqp from "amqplib";

let connection;
let channel;

export const RabbitMQ = {
  getChannel: async () => {
    if (!connection) {
      // Build connection options depending on environment
      const options =
        process.env.ENV !== "test"
          ? {
              protocol: "amqp",
              hostname: process.env.RMQ_HOST,
              port: process.env.RMQ_PORT,
              username: process.env.RMQ_USER,
              password: process.env.RMQ_PASS,
              heartbeat: 60,
            }
          : {
              protocol: "amqp",
              hostname: process.env.RMQ_HOST,
              port: process.env.RMQ_PORT,
              // no user/pass in test
            };

      connection = await amqp.connect(options);
    }

    if (!channel) {
      channel = await connection.createChannel();

      const exchange = process.env.RMQ_DELAYED_EXCHANGE;
      const queue = process.env.RMQ_DELAYED_QUEUE;
      const routingKey = process.env.RMQ_DELAYED_QUEUE;

      await channel.assertExchange(exchange, "x-delayed-message", {
        durable: true,
        arguments: { "x-delayed-type": "direct" },
      });

      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, exchange, routingKey);
    }

    return channel;
  },

  closeConnections: async () => {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
  },
};
