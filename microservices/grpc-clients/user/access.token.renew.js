import grpc from "@grpc/grpc-js";
import { fileURLToPath } from "node:url";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
const host = process.env.USER_GRPC_HOST ?? "user-grpc";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const AuthenticationGRPCClient = (() => {
  const PROTO_PATH =
    process.env.USER_PROTO_PATH ||
    path.resolve(__dirname, "../../../microservices/proto/user.proto");

  const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const grpcObj = grpc.loadPackageDefinition(packageDef);
  const AuthenticationService = grpcObj.user?.Authentication;

  if (!AuthenticationService) {
    throw new Error("Failed to load user.Authentication from proto schema");
  }

  const client = new AuthenticationService(
    `${host}:50051`,
    grpc.credentials.createInsecure(),
  );

  return {
    /**
     * Renews access token over gRPC.
     * @param {Object} input - { refresh_token }
     * @returns {Promise<{refresh_token: string, access_token: string}>}
     */
    async RenewAccessToken(input, options = {}) {
      if (!input?.refresh_token) {
        throw new Error("Missing required field: refresh_token.");
      }

      const deadline = new Date(Date.now() + (options.timeoutMs || 5000));

      return new Promise((resolve, reject) => {
        client.RenewAccessToken(input, { deadline }, (err, response) => {
          if (err) {
            const enrichedError = new Error(
              `gRPC RenewAccessToken Failed [Code ${err.code}]: ${err.details || err.message}`,
            );
            enrichedError.code = err.code;
            enrichedError.details = err.details;
            return reject(enrichedError);
          }
          resolve(response);
        });
      });
    },

    close() {
      client.close();
    },
  };
})();
