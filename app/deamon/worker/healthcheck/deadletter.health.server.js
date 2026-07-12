// app/deamon/workers/deadletter.main.js
import express from "express";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Spawn the worker as a child process
const childWorker = fork(
  path.resolve(__dirname, "./../deadletter.worker.js"),
  [],
  {
    env: { ...process.env },
    silent: false,
  },
);

// Express health server
const app = express();
const PORT = process.env.HEALTH_PORT || 3000;

app.get("/health", (req, res) => {
  // Ask the child worker for health via IPC
  childWorker.send("GET_HEALTH");

  const timeout = setTimeout(() => {
    res.status(500).json({ healthy: false, error: "Worker unresponsive" });
  }, 1000);

  childWorker.once("message", (response) => {
    clearTimeout(timeout);
    if (response && response.type === "HEALTH_REPORT") {
      const health = response.data;
      res.status(health.healthy ? 200 : 500).json(health);
    } else {
      res.status(500).json({ healthy: false, error: "Invalid response" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`[DeadLetter Health] Listening on port ${PORT}`);
  if (process.send) {
    process.send({ type: "READY" });
  }
});

// Forward shutdown signals to child
process.on("SIGTERM", () => {
  console.log("[Main] SIGTERM received, shutting down...");
  childWorker.kill("SIGTERM");
  process.exit(0);
});
