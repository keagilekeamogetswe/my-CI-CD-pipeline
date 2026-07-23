// websocket-server.js
import { WebSocketServer } from "ws";
import fs from "fs";

const TOKEN_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/token";
const PORT = process.env.PORT || 8081;

// Read the ServiceAccount token from the mounted file
function readToken() {
  try {
    return fs.readFileSync(TOKEN_PATH, "utf8").trim();
  } catch (err) {
    console.error("Error reading token:", err.message);
    return null;
  }
}

export function startWebSocketServer() {
  const wss = new WebSocketServer({ port: PORT });
  console.log(`WebSocket server running on ws://0.0.0.0:${PORT}`);

  function broadcastToken() {
    const token = readToken();
    if (!token) return;
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ token }));
      }
    });
  }

  wss.on("connection", (ws) => {
    console.log("Client connected");
    const token = readToken();
    if (token) ws.send(JSON.stringify({ token }));
    ws.on("close", () => console.log("Client disconnected"));
  });

  // Periodically broadcast token (in case Kubernetes rotates it)
  setInterval(broadcastToken, 10 * 60 * 1000);
}
