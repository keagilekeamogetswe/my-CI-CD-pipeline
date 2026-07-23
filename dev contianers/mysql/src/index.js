import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const { PrimaryPodElection } = await import("./actions/elect.js");
const { default: PodManager } = await import("./pod.manager.js");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    service: "mysql-operator",
    status: "running",
  });
});

app.get("/pods", async (req, res) => {
  try {
    const pods = await PodManager.getPods();

    res.json(
      [...pods.entries()].map(([name, value]) => ({
        name,
        ...value,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/elect", async (req, res) => {
  try {
    const pods = await PodManager.getPods();

    await PrimaryPodElection.elect_pod(pods);

    const updatedPods = await PodManager.getPods();

    res.json({
      success: true,
      pods: [...updatedPods.entries()].map(([name, value]) => ({
        name,
        ...value,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MySQL Operator listening on port ${PORT}`);
});
