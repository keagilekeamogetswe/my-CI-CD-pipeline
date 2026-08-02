import express from "express";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import { Database } from "../../db";
import { RabbitMQ } from "../../rabbitmq";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Spawn worker
const childWorker = fork(path.resolve(__dirname, "./../job.worker.js"), [], {
  env: { ...process.env },
  silent: false,
});

// Express health server
const app = express();
const PORT = process.env.HEALTH_PORT || 3000;

function log(message, extra = {}) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`, Object.keys(extra).length ? extra : "");
}

app.get("/health", async (req, res) => {
  log("[Health] Probe triggered");

  // -------------------------
  // RabbitMQ
  // -------------------------
  let mqStatus = "unknown";

  try {
    log("[Health][RabbitMQ] Starting connection check");

    const conStatus = await RabbitMQ.checkConnection();

    log("[Health][RabbitMQ] checkConnection() returned", conStatus);

    mqStatus = conStatus.status;

    log("[Health][RabbitMQ] Connection successful");
  } catch (err) {
    mqStatus = "unreachable";

    log("[Health][RabbitMQ] Connection FAILED", {
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
    log("[Health][MySQL] Opening connection");

    conn = await Database.getSQLConnection();

    log("[Health][MySQL] Connection acquired");

    await conn.query("SELECT 1");

    log("[Health][MySQL] SELECT 1 completed");

    dbStatus = "connected";
  } catch (err) {
    dbStatus = "unreachable";

    log("[Health][MySQL] FAILED", {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    if (conn && typeof conn.release === "function") {
      conn.release();
    }
  }

  // -------------------------
  // Child worker health request
  // -------------------------
  log("[Health] Sending GET_HEALTH to child worker");

  let isHandled = false;

  const handleWorkerResponse = (response) => {
    if (isHandled) return;
    isHandled = true;
    clearTimeout(timeout);
    childWorker.off("message", handleWorkerResponse);

    if (!response || response.type !== "HEALTH_REPORT") {
      log("[Health] Invalid worker response");

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

    log("[Health] Worker responded", workerHealth);

    const healthy =
      mqStatus === "connected" &&
      dbStatus === "connected" &&
      workerHealth.healthy;

    log("[Health] Final status", {
      healthy,
      rabbitmq: mqStatus,
      mysql: dbStatus,
    });

    res.status(healthy ? 200 : 500).json({
      healthy,
      rabbitmq: mqStatus,
      mysql: dbStatus,
      worker: workerHealth,
    });
  };

  const timeout = setTimeout(() => {
    if (isHandled) return;
    isHandled = true;
    childWorker.off("message", handleWorkerResponse);

    log("[Health] Worker timed out");

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
  log(`[Health] Listening on port ${PORT}`);

  if (process.send) {
    process.send({ type: "READY" });
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  log("[Main] SIGTERM received, shutting down...");
  childWorker.kill("SIGTERM");
  process.exit(0);
});