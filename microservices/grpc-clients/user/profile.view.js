import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.USER_GRPC_HOST ?? "user-grpc";
const port = process.env.USER_GRPC_PORT ?? "50051";

export const UserProfileGRPCClient = (() => {
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
  const ProfileViewingService = grpcObj.user?.ProfileViewing;

  if (!ProfileViewingService) {
    throw new Error("Failed to load user.ProfileViewing from proto schema");
  }

  const client = new ProfileViewingService(
    `${host}:${port}`,
    grpc.credentials.createInsecure(),
  );

  return {
    /**
     * Retrieves a user's profile over gRPC.
     * @param {Object} input
     * @param {string|number} input.user_id
     * @param {Object} [options]
     * @param {number} [options.timeoutMs=5000]
     */
    async ViewProfile({ user_id } = {}, options = {}) {
      if (!user_id) {
        throw new Error("Missing required field: user_id.");
      }

      const deadline = new Date(Date.now() + (options.timeoutMs || 5000));

      return new Promise((resolve, reject) => {
        client.ViewProfile(
          { user_id: String(user_id) },
          { deadline },
          (err, response) => {
            if (err) {
              const enrichedError = new Error(
                `gRPC ViewProfile Failed [Code ${err.code}]: ${err.details || err.message}`,
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
