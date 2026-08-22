import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import { Database } from "../db.js";
import { RecoverAccountHandler } from "./handlers/recover.account.js";
import { CreateAccountRequestHandler } from "./handlers/account.creation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROTO_PATH = path.resolve(__dirname, "../../proto/user.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const grpcObj = grpc.loadPackageDefinition(packageDef);

const RecoverAccountService = grpcObj.user.RecoverAccount;
const AccountCreationService = grpcObj.user.AccountCreation;

function log(message, extra = {}) {
  const ts = new Date().toISOString();

  console.log(`[${ts}] ${message}`, Object.keys(extra).length ? extra : "");
}

/* ---------------------------------------------------------- */
/* gRPC */
/* ---------------------------------------------------------- */

export function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(RecoverAccountService.service, {
    RecoverAccount: RecoverAccountHandler,
  });

  server.addService(AccountCreationService.service, {
    CreateAccountRequest: CreateAccountRequestHandler,
  });

  server.bindAsync(
    `0.0.0.0:${process.env.GRPC_USER_PORT || 50051}`,
    grpc.ServerCredentials.createInsecure(),
    (err) => {
      if (err) {
        log("[gRPC] Failed to start", {
          error: err.message,
        });

        throw err;
      }

      server.start();

      if (process.send) {
        process.send({ type: "READY" });
      }

      log("[gRPC] RecoverAccount service started", {
        port: process.env.GRPC_USER_PORT || 50051,
      });
    },
  );

  return server;
}

/* ---------------------------------------------------------- */
/* Health */
/* ---------------------------------------------------------- */

function startHttpHealthServer() {
  const app = express();

  app.get("/health", async (req, res) => {
    log("[Health] Probe received");

    let conn;
    let dbStatus = "unknown";

    try {
      log("[Health][MySQL] Acquiring connection");

      conn = await Database.getSQLConnection();

      log("[Health][MySQL] Connection acquired");

      log("[Health][MySQL] Executing SELECT 1");

      await conn.query("SELECT 1");

      log("[Health][MySQL] SELECT 1 completed");

      dbStatus = "connected";
    } catch (err) {
      dbStatus = "unreachable";

      log("[Health][MySQL] FAILED", {
        error: err.message,
        stack: err.stack,
      });
    } finally {
      if (conn) {
        conn.release();

        log("[Health][MySQL] Connection released");
      }
    }

    log("[Health] Returning response", {
      dbStatus,
    });

    res.status(dbStatus === "connected" ? 200 : 500).json({
      status: dbStatus === "connected" ? "ok" : "error",
      db: dbStatus,
    });
  });

  const port = process.env.HEALTH_PORT || 3000;

  app.listen(port, () => {
    log("[Health] HTTP server started", {
      port,
    });
  });
}

/* ---------------------------------------------------------- */
/* Shutdown */
/* ---------------------------------------------------------- */

process.on("SIGTERM", async () => {
  log("[Main] SIGTERM received");

  await Database.closeConnections();

  log("[Main] Database pool closed");

  process.exit(0);
});

process.on("SIGINT", async () => {
  log("[Main] SIGINT received");

  await Database.closeConnections();

  log("[Main] Database pool closed");

  process.exit(0);
});

/* ---------------------------------------------------------- */

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startGrpcServer();
  startHttpHealthServer();
}
