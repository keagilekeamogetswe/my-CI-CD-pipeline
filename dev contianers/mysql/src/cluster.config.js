import WebSocket from "ws";
import dns from "dns/promises";

async function resolveMinikubeIp() {
  try {
    const result = await dns.lookup("minikube");
    return result.address;
  } catch (err) {
    console.error("Failed to resolve Minikube DNS:", err);
    return null;
  }
}
const skip_verify = process.env.ENV === "test";
const minikube_ip = await resolveMinikubeIp();
console.log({ "Minikube ip: ": minikube_ip });
function getToken() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${minikube_ip}:31080`); // Minikube IP + NodePort

    ws.on("open", () => {
      console.log("Connected to WebSocket server");
      ws.send("get_token"); // request token
    });

    ws.on("message", (data) => {
      try {
        const { token } = JSON.parse(data);
        resolve(token); //resolve the promise with the token
        ws.close();
      } catch (err) {
        reject(err);
      }
    });

    ws.on("error", (err) => reject(err));
  });
}
const api_token = await getToken();
console.log(api_token);
export const k8s_cluster_config = {
  clusters: [
    {
      name: "minikube",
      server: "https://minikube:8443",
      skipTLSVerify: skip_verify, // Development only
    },
  ],
  users: [
    {
      name: "developer",
      user: {
        token: api_token,
      },
    },
  ],
  contexts: [
    {
      name: "minikube",
      cluster: "minikube",
      user: "developer",
    },
  ],
  currentContext: "minikube",
};
