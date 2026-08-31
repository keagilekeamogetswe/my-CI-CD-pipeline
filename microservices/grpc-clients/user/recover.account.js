import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.USER_GRPC_HOST ?? "user-grpc";

export const UserRecoverAccountGRPCClient = (() => {
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
  const RecoverAccountService = grpcObj.user?.RecoverAccount;

  if (!RecoverAccountService) {
    throw new Error("Failed to load user.RecoverAccount from proto schema");
  }

  const client = new RecoverAccountService(
    `${host}:50051`,
    grpc.credentials.createInsecure(),
  );

  return {
    /**
     * Recovers a user account over gRPC.
     * @param {Object} input - { userId, password, deviceInfo }
     * @returns {Promise<{refresh_token: string, success: boolean, message?: string}>}
     */
    async RecoverAccount(input, options = {}) {
      const deadline = new Date(Date.now() + (options.timeoutMs || 5000));

      return new Promise((resolve, reject) => {
        client.RecoverAccount(input, { deadline }, (err, response) => {
          if (err) {
            const enrichedError = new Error(
              `gRPC RecoverAccount Failed [Code ${err.code}]: ${err.details || err.message}`,
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
