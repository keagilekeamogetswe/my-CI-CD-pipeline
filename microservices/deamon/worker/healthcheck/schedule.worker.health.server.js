// app/deamon/worker/healthcheck/schedule.worker.health.server.js

import express from "express";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import { Database } from "../../db";
import { RabbitMQ } from "../../rabbitmq";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Spawn the Schedule Worker as a child process
const childWorker = fork(
  path.resolve(__dirname, "./../schedule.worker.js"),
  [],
  {
    env: { ...process.env },
    silent: false,
  }
);

const app = express();
const PORT = process.env.HEALTH_PORT || 3002;

function logWithTime(message, extra = {}) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`, Object.keys(extra).length ? extra : "");
}

app.get("/health", async (req, res) => {
  logWithTime("[Health] Probe triggered");

  // -------------------------
  // RabbitMQ
  // -------------------------
  let mqStatus = "unknown";

  try {
    logWithTime("[Health][RabbitMQ] Starting connection check");

    const conStatus = await RabbitMQ.checkConnection();

    logWithTime("[Health][RabbitMQ] checkConnection() returned", conStatus);

    mqStatus = conStatus.status;

    logWithTime("[Health][RabbitMQ] Connection successful");
  } catch (err) {
    mqStatus = "unreachable";

    logWithTime("[Health][RabbitMQ] Connection FAILED", {
      error: err.message,
      stack: err.stack,
    });
  }

  // -------------------------
  // MySQL
  // -------------------------
  let dbStatus = "unknown";
  let conn;

  try {
    logWithTime("[Health][MySQL] Opening connection");

    conn = await Database.getSQLConnection();

    logWithTime("[Health][MySQL] Connection acquired");

    await conn.query("SELECT 1");

    logWithTime("[Health][MySQL] SELECT 1 completed");

    dbStatus = "connected";
  } catch (err) {
    dbStatus = "unreachable";

    logWithTime("[Health][MySQL] FAILED", {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    if (conn && typeof conn.release === "function") {
      conn.release();
    }
  }

  // -------------------------
  // Worker Health Request
  // -------------------------
  logWithTime("[Health] Sent GET_HEALTH to child worker");

  let isHandled = false;

  const handleWorkerResponse = (response) => {
    if (isHandled) return;
    isHandled = true;
    clearTimeout(timeout);
    childWorker.off("message", handleWorkerResponse);

    if (!response || response.type !== "HEALTH_REPORT") {
      logWithTime("[Health] Invalid worker response", response);

      return res.status(500).json({
        healthy: false,
        rabbitmq: mqStatus,
        mysql: dbStatus,
        worker: {
          healthy: false,
          error: "Invalid worker response",
        },
      });
    }

    const workerHealth = response.data;

    logWithTime("[Health] Worker responded", workerHealth);

    const healthy =
      workerHealth.healthy &&
      dbStatus === "connected" &&
      mqStatus === "connected";

    logWithTime("[Health] Final status", {
      healthy,
      dbStatus,
      mqStatus,
    });

    res.status(healthy ? 200 : 500).json({
      healthy,
      worker: workerHealth,
      mysql: dbStatus,
      rabbitmq: mqStatus,
    });
  };

  const timeout = setTimeout(() => {
    if (isHandled) return;
    isHandled = true;
    childWorker.off("message", handleWorkerResponse);

    logWithTime("[Health] Worker unresponsive after 1s");

    res.status(500).json({
      healthy: false,
      rabbitmq: mqStatus,
      mysql: dbStatus,
      worker: {
        healthy: false,
        error: "Worker unresponsive",
      },
    });
  }, 1000);

  childWorker.on("message", handleWorkerResponse);
  childWorker.send("GET_HEALTH");
});

app.listen(PORT, () => {
  logWithTime(`[Schedule Health] Listening on port ${PORT}`);

  if (process.send) {
    process.send({ type: "READY" });
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logWithTime("[Main] SIGTERM received, shutting down...");
  childWorker.kill("SIGTERM");
  process.exit(0);
});