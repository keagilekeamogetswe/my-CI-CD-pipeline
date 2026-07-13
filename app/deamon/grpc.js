import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { Database } from "./db.js";

const PROTO_PATH = path.resolve(process.cwd(), "app/proto/deamon.proto"); // <-- must be a file
const packageDef = protoLoader.loadSync(PROTO_PATH, {});
const grpcObj = grpc.loadPackageDefinition(packageDef);
const JobService = grpcObj.jobs.JobService;

async function addJob(call, callback) {
  const mysql_connection = await Database.getSQLConnection();
  const { type, payload } = call.request;
  const [result] = await mysql_connection.execute(
    `INSERT INTO jobs (type, payload) VALUES (?, ?)`,
    [type, payload],
  );
  callback(null, { id: result.insertId, status: "queued" });
}

function main() {
  const server = new grpc.Server();
  server.addService(JobService.service, { AddJob: addJob });
  server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    (err) => {
      if (err) throw err;
      server.start();
      if (process.send) process.send({ type: "READY" }); // signal to tests
    },
  );
}

main();
