import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

import { Database } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROTO_PATH = path.resolve(__dirname, "../proto/deamon.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const grpcObj = grpc.loadPackageDefinition(packageDef);

const JobService = grpcObj.jobs.JobService;

function log(message, extra = {}) {
  const ts = new Date().toISOString();

  console.log(
    `[${ts}] ${message}`,
    Object.keys(extra).length ? extra : "",
  );
}

/* ---------------------------------------------------------- */
/* gRPC */
/* ---------------------------------------------------------- */

async function addJob(call, callback) {
  let conn;

  try {
    log("[gRPC] AddJob request received", {
      type: call.request.type,
    });

    log("[gRPC][MySQL] Acquiring connection");

    conn = await Database.getSQLConnection();

    log("[gRPC][MySQL] Connection acquired");

    const { type, payload } = call.request;

    log("[gRPC][MySQL] Executing INSERT");

    const [result] = await conn.execute(
      `INSERT INTO jobs (type, payload) VALUES (?, ?)`,
      [type, payload],
    );

    log("[gRPC][MySQL] INSERT completed", {
      insertId: result.insertId,
    });

    callback(null, {
      id: result.insertId,
      status: "queued",
    });
  } catch (err) {
    log("[gRPC] AddJob FAILED", {
      error: err.message,
      stack: err.stack,
    });

    callback(err);
  } finally {
    if (conn) {
      conn.release();
      log("[gRPC][MySQL] Connection released");
    }
  }
}

function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(JobService.service, {
    AddJob: addJob,
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

      log("[gRPC] Server started", {
        port: process.env.GRPC_USER_PORT || 50051,
      });
    },
  );
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

startGrpcServer();
startHttpHealthServer();