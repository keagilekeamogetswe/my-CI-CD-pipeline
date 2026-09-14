import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.USER_GRPC_HOST ?? "user-grpc";
const port = process.env.USER_GRPC_PORT ?? "50051";

export const UserProfileModifierGRPCClient = (() => {
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
  const ProfileModificationService = grpcObj.user?.ProfileModification;

  if (!ProfileModificationService) {
    throw new Error(
      "Failed to load user.ProfileModification from proto schema",
    );
  }

  const client = new ProfileModificationService(
    `${host}:${port}`,
    grpc.credentials.createInsecure(),
  );

  return {
    /**
     * Updates either the primary SQL profile fields or secondary profile configuration,
     * or retrieves resolved configuration via method="get".
     * @param {Object} input
     * @param {string|number} input.user_id
     * @param {Object} [input.primaryConfig]
     * @param {Object} [input.config]
     * @param {Object} [options]
     * @param {number} [options.timeoutMs=5000]
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async ModifyProfile(
      { user_id, primaryConfig, config, method } = {},
      options = {},
    ) {
      if (!user_id) {
        throw new Error("Missing required field: user_id.");
      }

      const normalizedMethod = method?.toLowerCase();
      const isNonEmptyObject = (value) =>
        Boolean(
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          Object.keys(value).length > 0,
        );
      const hasPrimaryConfig = isNonEmptyObject(primaryConfig);
      const hasConfig = isNonEmptyObject(config);

      if (normalizedMethod === "get") {
        if (hasPrimaryConfig || hasConfig) {
          throw new Error(
            'Do not provide primaryConfig or config when method is "get".',
          );
        }
      } else if (Number(hasPrimaryConfig) + Number(hasConfig) !== 1) {
        throw new Error(
          "Provide exactly one non-empty update: primaryConfig or config.",
        );
      }

      const requestPayload = {
        user_id: String(user_id),
        ...(normalizedMethod ? { method: normalizedMethod } : {}),
        ...(hasPrimaryConfig
          ? { primary_config: { values: primaryConfig } }
          : hasConfig
            ? { config: { values: config } }
            : {}),
      };
      const deadline = new Date(Date.now() + (options.timeoutMs || 5000));

      return new Promise((resolve, reject) => {
        client.ModifyProfile(requestPayload, { deadline }, (err, response) => {
          if (err) {
            const enrichedError = new Error(
              `gRPC ModifyProfile Failed [Code ${err.code}]: ${err.details || err.message}`,
            );
            enrichedError.code = err.code;
            enrichedError.details = err.details;
            return reject(enrichedError);
          }

          resolve(response);
        });
      });
    },

    async GetProfileConfig({ user_id } = {}, options = {}) {
      const response = await this.ModifyProfile(
        { user_id, method: "get" },
        options,
      );
      return response.config;
    },

    close() {
      client.close();
    },
  };
})();
