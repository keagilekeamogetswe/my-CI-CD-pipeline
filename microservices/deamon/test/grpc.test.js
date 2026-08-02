import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";
import { expect, it } from "vitest";
import { createPool } from "mysql2/promise";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const options = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "rootpassword123" ,
  database: "social_test_db"
}
const pool = createPool(options);
const conn = await pool.getConnection();


const PROTO_PATH = path.resolve(__dirname, "../../proto/deamon.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObj = grpc.loadPackageDefinition(packageDef);

it("should add a job via gRPC", async () => {

const [result] = await conn.execute(
  `
  INSERT INTO user_credentials (
    email,
    password_hash
  )
  VALUES (?, ?)
  `,
  [
    "john.doe@example.",
    "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890",
  ]
);

console.log("Inserted user:", result.insertId);

conn.release();
  console.log("Current directory:", __dirname);
  console.log("Proto file:", PROTO_PATH);

  const client = new grpcObj.jobs.JobService(
    "localhost:50051",
    grpc.credentials.createInsecure()
  );

  const response = await new Promise((resolve, reject) => {
    client.AddJob(
      {
        type: "session.save",
        payload: JSON.stringify( {
        "user_id": result.insertId,
        "jti": "jti_job_testing",
        "token_hash": "hash_031",
        "expires_at": "2026-12-31 23:59:59",
        "fp_hash": "fp_031"
      }),
      },
      (err, response) => {
        if (err) {
          console.error("gRPC Error:", err);
          return reject(err);
        }

        console.log("gRPC Response:", response);
        resolve(response);
      }
    );
  });

  expect(response.status).toBe("queued");
  expect(Number(response.id)).toBeGreaterThan(0);
});