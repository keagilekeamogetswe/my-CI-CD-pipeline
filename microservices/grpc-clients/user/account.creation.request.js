import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.USER_GRPC_HOST ?? "user-grpc";

export const UserCreateAccountRequestGRPCClient = (() => {
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
     * Requests account creation over gRPC.
     * @param {Object} profileData - { name, lastname, dob, phone, device_info, ip_address, fp_hash }
     * @returns {Promise<{verification_token: string, success: boolean, message?: string}>}
     */
    async CreateAccountRequest(profileData, options = {}) {
      const deadline = new Date(Date.now() + (options.timeoutMs || 5000));

      return new Promise((resolve, reject) => {
        client.CreateAccountRequest(
          profileData,
          { deadline },
          (err, response) => {
            if (err) {
              const enrichedError = new Error(
                `gRPC CreateAccountRequest Failed [Code ${err.code}]: ${err.details || err.message}`,
              );
              enrichedError.code = err.code;
              enrichedError.details = err.details;
              return reject(enrichedError);
            }
            resolve(response);
          },
        );
      });
    },

    close() {
      client.close();
    },
  };
})();
