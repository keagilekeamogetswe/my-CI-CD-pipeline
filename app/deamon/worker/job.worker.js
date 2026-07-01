import RealtimeJobExecuter from "./modules/executer.js";

// 1. REGISTER LISTENERS FIRST
// This ensures Node.js knows how to answer IPC signals immediately upon bootup
process.on("message", (message) => {
  if (message === "GET_HEALTH") {
    const health = RealtimeJobExecuter.checkHealth();
    process.send({ type: "HEALTH_REPORT", data: health });
  }
});

process.on("SIGTERM", async () => {
  console.log("[Child Worker] Received SIGTERM. Shutting down daemon loop...");
  await RealtimeJobExecuter.stop();
  process.exit(0);
});

// 2. KICK OFF THE BLOCKING LOOP AT THE VERY BOTTOM
RealtimeJobExecuter.start();
