import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.USER_GRPC_HOST ?? "user-grpc";

export const UserCreateAccountConfirmGRPCClient = (() => {
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
  const AccountCreationService = grpcObj.user?.AccountCreation;

  if (!AccountCreationService) {
    throw new Error("Failed to load user.AccountCreation from proto schema");
  }

  const client = new AccountCreationService(
    `${host}:50051`,
    grpc.credentials.createInsecure(),
  );

  return {
    /**
     * Confirms account creation over gRPC.
     * @param {Object} input - { verification_token, code }
     * @returns {Promise<{refresh_token: string, success: boolean, message?: string}>}
     */
    async CreateAccountConfirm(input, options = {}) {
      if (!input?.verification_token || !input?.code) {
        throw new Error(
          "Missing required fields: verification_token and code.",
        );
      }

      const deadline = new Date(Date.now() + (options.timeoutMs || 5000));

      return new Promise((resolve, reject) => {
        client.CreateAccountConfirm(input, { deadline }, (err, response) => {
          if (err) {
            const enrichedError = new Error(
              `gRPC CreateAccountConfirm Failed [Code ${err.code}]: ${err.details || err.message}`,
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
