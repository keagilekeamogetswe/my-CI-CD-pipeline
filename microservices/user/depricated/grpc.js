import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { UserProfile } from "./profile.js";
import { Database } from "./db.js";
import dotenv from "dotenv";
import GRPCUserProfileService from "./grpc-methods/service-profile.user.js";
dotenv.config({ path: "./app/user/.env" });

const port = process.env.GRPC_USER_PORT;
// Load proto definition
const packageDef = protoLoader.loadSync("./app/proto/user.proto", {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// Access the package
const proto = grpc.loadPackageDefinition(packageDef).user;
const server = new grpc.Server();
const sqlConnection = await Database.getSQLConnection();
const mongoCollection = await Database.getMongoConnection("user_profiles");
const ProfileService = new UserProfile(sqlConnection, mongoCollection);

server.addService(proto.ProfileService.service, GRPCUserProfileService);

server.bindAsync(
  `0.0.0.0:${port}`,
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log(`ProfileService running on port ${port}`);
    server.start();
  },
);
