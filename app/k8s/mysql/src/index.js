import dotenv from "dotenv";

// This loads environment variables immediately
dotenv.config({ path: "../.env" });

// FORCE the code to wait until dotenv is ready before loading modules
const { PrimaryPodElection } = await import("./actions/elect.js");

const { k8s_api } = await import("./k8.object.interface.js");
const { default: PodManager } = await import("./pod.manager.js");

// Now this is guaranteed to have the loaded environment variables
const pods = await PodManager.getPods();
console.log("pods----", pods);
console.log(PrimaryPodElection);
await PrimaryPodElection.elect_pod(pods);
// await PodManager.setToPrimary("mysql-0");
const new_pods = await PodManager.getPods();
console.log("pods", new_pods);
