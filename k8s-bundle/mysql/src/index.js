
import express from "express";
import { spawnWatcherProcess } from "./actions/watcher/watcher.worker";
import { PodElection } from "./actions/election/election.ops";
import PodManager from "./pod.manager";

// --- Start Express Server ---
const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/ready", (req, res) => res.status(200).json({ status: "ready" }));
app.get("/pods", async (req, res) => {
  try {
    const podsMap = await PodManager.getPods();

    // Convert Map -> Plain Object so Express serializes it properly to JSON
    const pods = Object.fromEntries(podsMap);

    res.status(200).json(pods);
  } catch (error) {
    console.error("Failed to fetch pods:", error);
    res.status(500).json({ error: "Failed to fetch pod list from cluster." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`MySQL Operator listening on port ${PORT}`);

  // Launch the persistent child watcher process after server startup
  spawnWatcherProcess();
});
