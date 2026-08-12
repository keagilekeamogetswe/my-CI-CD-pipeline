import path from "path";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { createPool } from "mysql2/promise";
import { expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// gRPC Setup
const PROTO_PATH = path.resolve(__dirname, "../proto/deamon.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObj = grpc.loadPackageDefinition(packageDef);
const host = process.env.DEAMON_GRPC_HOST ?? "deamon-grpc";

// Reusable client instance
const client = new grpcObj.jobs.JobService(
  `${host}:50051`,
  grpc.credentials.createInsecure()
);

export const DeamonClient = {
  /**
   * Adds a job via gRPC
   * @param {string} type
   * @param {object|string} payload
   * @returns {Promise<object>}
   */
  addJob: (type, payload) => {
    return new Promise((resolve, reject) => {
      const payloadString =
        typeof payload === "string" ? payload : JSON.stringify(payload);

      client.AddJob(
        {
          type,
          payload: payloadString,
        },
        (err, response) => {
          if (err) {
            console.error("gRPC Error:", err);
            return reject(err);
          }

          console.log("gRPC Response:", response);
          return resolve(response);
        }
      );
    });
  },
};