import PodManager from "../../pod.manager";
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { ElectionOrchestrator } from "../election/orchestrator";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to start and keep the child process alive
export function spawnWatcherProcess() {
  const watcherPath = path.resolve(__dirname, "./watch.js");
  console.log(`[Main] Spawning watcher child process: ${watcherPath}`);
  // Pass extensionless flags if necessary to preserve module loader context
  const child = fork(watcherPath, [], {
    execArgv: ["--import=extensionless/register"],
  });

  // Receive IPC events sent from the child via process.send()
  child.on("message", async (msg) => {
    console.log(`[IPC Event from Watcher]`);
    // election logic directly in parent here!
    const { event, pod } = msg;

    if (event === "READY") {
      console.log("EVENT: ", event);
      console.log("Ready POD: ", pod.name, pod.role);
      await ElectionOrchestrator.push(pod)
    }
    else if (event === "DELETED" || event === "ERROR") {
      const wasPrimary = pod.role === "primary";

      await PodManager.removeRole(pod);

      if (wasPrimary) {
          console.log("Primary deleted");
          await ElectionOrchestrator.promote();
      }
    }

  });

  // Detect child process termination & auto-restart
  child.on("exit", (code, signal) => {
    console.error(
      `⚠️ [Main] Watcher child process exited with code ${code} (Signal: ${signal}). Respawning in 3 seconds...`,
    );
    setTimeout(spawnWatcherProcess, 3000);
  });

  return child;
}