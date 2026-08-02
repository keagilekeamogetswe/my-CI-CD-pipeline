// app/deamon/workers/deadletter.main.js

import express from "express";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { Database } from "../../db";
import { RabbitMQ } from "../../rabbitmq";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function logWithTime(message, extra = {}) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${message}`, Object.keys(extra).length ? extra : "");
}

// ----------------------------------------------------
// Spawn worker
// ----------------------------------------------------

logWithTime("[Main] Starting DeadLetter worker process");

const childWorker = fork(
  path.resolve(__dirname, "./../deadletter.worker.js"),
  [],
  {
    env: { ...process.env },
    silent: false,
  },
);

childWorker.on("spawn", () => {
  logWithTime("[Worker] Child process spawned");
});

childWorker.on("error", (err) => {
  logWithTime("[Worker] Child process error", {
    error: err.message,
    stack: err.stack,
  });
});

childWorker.on("exit", (code, signal) => {
  logWithTime("[Worker] Child process exited", {
    code,
    signal,
  });
});

// ----------------------------------------------------
// Express health server
// ----------------------------------------------------

const app = express();
const PORT = process.env.HEALTH_PORT || 3000;

app.get("/health", async (req, res) => {
  logWithTime("[Health] =================================================");
  logWithTime("[Health] Probe triggered");

  let isTimedOut = false;

  const onMessage = async (response) => {
    if (isTimedOut) {
      logWithTime("[Health] Ignoring worker response because request already timed out");
      return;
    }

    clearTimeout(timeout);

    logWithTime("[Health] Received IPC response from worker");

    if (response && response.type === "HEALTH_REPORT") {
      const workerHealth = response.data;

      logWithTime("[Health][Worker] Worker health", workerHealth);

      //----------------------------------------------------
      // MySQL
      //----------------------------------------------------

      let dbStatus = "unknown";
      let conn;

      try {
        logWithTime("[Health][MySQL] Requesting pooled connection");

        conn = await Database.getSQLConnection();

        logWithTime("[Health][MySQL] Connection acquired successfully");

        logWithTime("[Health][MySQL] Executing SELECT 1");

        await conn.query("SELECT 1");

        logWithTime("[Health][MySQL] SELECT 1 completed successfully");

        dbStatus = "connected";
      } catch (err) {
        dbStatus = "unreachable";

        logWithTime("[Health][MySQL] Health check FAILED", {
          error: err.message,
          stack: err.stack,
        });
      } finally {
        if (conn && typeof conn.release === "function") {
          conn.release();

          logWithTime("[Health][MySQL] Connection released back to pool");
        } else {
          logWithTime("[Health][MySQL] No connection available to release");
        }
      }

      //----------------------------------------------------
      // RabbitMQ
      //----------------------------------------------------

      let mqStatus = "unknown";

      try {
        logWithTime("[Health][RabbitMQ] Starting health check");

        const conStatus = await RabbitMQ.checkConnection();

        logWithTime("[Health][RabbitMQ] checkConnection() returned", conStatus);

        mqStatus = conStatus?.status || "connected";

        logWithTime("[Health][RabbitMQ] RabbitMQ connection successful");
      } catch (err) {
        mqStatus = "unreachable";

        logWithTime("[Health][RabbitMQ] Health check FAILED", {
          error: err.message,
          stack: err.stack,
        });
      }

      //----------------------------------------------------
      // Final Health
      //----------------------------------------------------

      const isWorkerOk = workerHealth?.healthy ?? true;
      const isDbOk = dbStatus === "connected";
      const isMqOk = mqStatus === "connected";

      const healthy = isWorkerOk && isDbOk && isMqOk;

      logWithTime("[Health] Final health evaluation", {
        workerHealthy: isWorkerOk,
        mysqlHealthy: isDbOk,
        rabbitHealthy: isMqOk,
        overallHealthy: healthy,
      });

      logWithTime("[Health] Sending HTTP response");

      return res.status(healthy ? 200 : 500).json({
        worker: workerHealth,
        mysql: dbStatus,
        rabbitmq: mqStatus,
        healthy,
      });
    }

    logWithTime("[Health] Invalid worker response", response);

    return res.status(500).json({
      healthy: false,
      error: "Invalid response",
    });
  };

  //----------------------------------------------------
  // Timeout
  //----------------------------------------------------

  const timeout = setTimeout(() => {
    isTimedOut = true;

    childWorker.off("message", onMessage);

    logWithTime("[Health] Worker did not respond within timeout");

    return res.status(500).json({
      healthy: false,
      error: "Worker unresponsive",
    });
  }, 1000);

  //----------------------------------------------------
  // Request worker health
  //----------------------------------------------------

  childWorker.once("message", onMessage);

  logWithTime("[Health] Sending GET_HEALTH IPC message");

  childWorker.send("GET_HEALTH");
});

// ----------------------------------------------------
// Start server
// ----------------------------------------------------

app.listen(PORT, () => {
  logWithTime(`[Main] DeadLetter health server listening on port ${PORT}`);

  if (process.send) {
    process.send({ type: "READY" });
    logWithTime("[Main] READY signal sent to parent process");
  }
});

// ----------------------------------------------------
// Process lifecycle logging
// ----------------------------------------------------

process.on("SIGTERM", () => {
  logWithTime("[Main] SIGTERM received");

  childWorker.kill("SIGTERM");

  logWithTime("[Main] Child worker terminated");

  process.exit(0);
});

process.on("SIGINT", () => {
  logWithTime("[Main] SIGINT received");

  childWorker.kill("SIGINT");

  logWithTime("[Main] Child worker terminated");

  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logWithTime("[Main] Uncaught exception", {
    error: err.message,
    stack: err.stack,
  });
});

process.on("unhandledRejection", (reason) => {
  logWithTime("[Main] Unhandled promise rejection", {
    reason,
  });
});

process.on("exit", (code) => {
  logWithTime("[Main] Process exiting", {
    exitCode: code,
  });
});