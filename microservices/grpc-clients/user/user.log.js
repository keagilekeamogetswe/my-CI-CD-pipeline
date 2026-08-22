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
     * Authenticates a user over gRPC.
     * @param {Object} payload
     * @param {string|number} payload.userId - User identifier.
     * @param {string} payload.password - Plaintext password.
     * @param {Object|string} payload.deviceInfo - Metadata object or JSON string describing the requesting device.
     * @param {Object} [options]
     * @param {number} [options.timeoutMs=5000] - Call deadline in milliseconds.
     * @returns {Promise<{refresh_token: string, success: boolean, message?: string}>}
     */
    async RecoverAccount({ userId, password, deviceInfo }, options = {}) {
      if (!userId || !password) {
        throw new Error(
          "Missing required credentials: userId and password are required.",
        );
      }

      // Normalize device_info to a JSON string
      const formattedDeviceInfo =
        typeof deviceInfo === "string"
          ? deviceInfo
          : JSON.stringify(deviceInfo || {});

      const requestPayload = {
        user_id: String(userId),
        password,
        device_info: formattedDeviceInfo,
      };

      const deadline = new Date(Date.now() + (options.timeoutMs || 5000));

      return new Promise((resolve, reject) => {
        client.RecoverAccount(requestPayload, { deadline }, (err, response) => {
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

    /**
     * Gracefully closes the cached gRPC channel.
     */
    close() {
      client.close();
    },
  };
})();
