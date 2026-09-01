import { fork, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { generateKeyPairSync } from "crypto";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.resolve(__dirname, "./../../tests/.env");
const envConfig = dotenv.parse(await fs.readFile(envPath));

for (const key in envConfig) {
  process.env[key] = envConfig[key];
}

const PORT = "3002";
const GRPC_PORT = "50051";

// Both forked services run on the host during tests, not on the Docker network.
process.env.USER_GRPC_HOST = "localhost";
process.env.GRPC_USER_PORT = GRPC_PORT;
process.env.USER_GRPC_PORT = GRPC_PORT;

// Auto add .env for tests
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY = publicKey;
process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY = privateKey;

dotenv.config({ path: "./../../tests/.env" });

let grpcServerProcess = null;
let webServerProcess = null;
let isCleaningUp = false;

// Precise port killer for Windows and Unix
function killPort(port) {
  try {
    if (process.platform === "win32") {
      const stdout = execSync(
        `netstat -ano | findstr LISTENING | findstr :${port}`,
      ).toString();
      const lines = stdout.trim().split("\n");
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && pid !== process.pid.toString()) {
          try {
            execSync(`taskkill /F /PID ${pid} 2>nul`);
          } catch (_) {}
        }
      });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
    }
  } catch (err) {
    // Port wasn't bound
  }
}

function attachLogger(proc, label) {
  proc.stdout?.on("data", (data) =>
    console.log(`[${label}] ${data.toString().trim()}`),
  );
  proc.stderr?.on("data", (data) =>
    console.error(`[${label} ERROR] ${data.toString().trim()}`),
  );
}

function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  console.log("\n🧹 Cleaning up child processes...");

  const killProc = (proc, label) => {
    if (proc && proc.pid) {
      try {
        if (process.platform === "win32") {
          execSync(`taskkill /F /T /PID ${proc.pid} 2>nul`);
        } else {
          proc.kill("SIGKILL");
        }
        console.log(`Stopped ${label}.`);
      } catch (err) {}
    }
  };

  killProc(grpcServerProcess, "gRPC Service");
  killProc(webServerProcess, "Express WebServer");
}

async function startGRPCUserServer() {
  grpcServerProcess = fork(
    path.resolve(__dirname, "../../microservices/user/grpc/index.js"),
    [],
    {
      execArgv: ["--import=extensionless/register"],
      env: {
        ...process.env,
        ENV: "test",
        USER_GRPC_HOST: "localhost",
        GRPC_USER_PORT: GRPC_PORT,
        USER_GRPC_PORT: GRPC_PORT,
      },
      silent: true,
    },
  );

  attachLogger(grpcServerProcess, "gRPC Service");

  await new Promise((resolve, reject) => {
    grpcServerProcess.once(
      "message",
      (msg) => msg?.type === "READY" && resolve(),
    );
    grpcServerProcess.once("error", reject);
    grpcServerProcess.once("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`gRPC server exited with code ${code}`));
      }
    });
  });
}

async function startWebserver() {
  webServerProcess = fork(
    path.resolve(__dirname, "../../microservices/swift-webserver/index.js"),
    [],
    {
      execArgv: ["--import=extensionless/register"],
      env: {
        ...process.env,
        PORT,
        ENV: "test",
        USER_GRPC_HOST: "localhost",
        GRPC_USER_PORT: GRPC_PORT,
        USER_GRPC_PORT: GRPC_PORT,
      },
      silent: true,
    },
  );

  attachLogger(webServerProcess, "Express WebServer");

  await new Promise((resolve, reject) => {
    webServerProcess.once(
      "message",
      (msg) => msg?.type === "READY" && resolve(),
    );
    webServerProcess.once("error", reject);
    webServerProcess.once("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Web server exited with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    console.log("Pre-checking ports 50051 and 3002...");
    killPort(GRPC_PORT);
    killPort(PORT);

    console.log("Starting gRPC Server...");
    await startGRPCUserServer();
    console.log("Starting Web Server...");
    await startWebserver();
    console.log(`🚀 Both services online. Express ready on port ${PORT}`);
  } catch (err) {
    console.error("Failed to start services:", err);
    cleanup();
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
process.on("exit", () => {
  cleanup();
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  cleanup();
  process.exit(1);
});

main();
