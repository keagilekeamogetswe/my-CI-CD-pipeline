import { JWTHelper } from "../../utility/jwt.js";
import { Database } from "../db.js";
import { UserProfile } from "../profile.js";

const GRPCUserSessionService = (() => {
  // Cache the singleton instance
  let user_profile_instance = null;
  // Helper to resolve and cache the singleton asynchronously
  const get_profile_instance = async () => {
    if (!user_profile_instance) {
      const collection_name = "user_profile";

      // Await database connections in parallel
      const [mysql_connection, mongo_collection] = await Promise.all([
        Database.getSQLConnection(),
        Database.getMongoConnection(collection_name),
      ]);

      user_profile_instance = new UserProfile(
        mysql_connection,
        mongo_collection,
      );
    }
    return user_profile_instance;
  };

  return {
    InitialiseProfile: async (call, callback) => {
      try {
        const { jwt_token } = call.request;

        const payload = await JWTHelper.decode(
          jwt_token,
          process.env.JWT_SET_PASS_STATE,
        );
      } catch (error) {
        callback({
          code: 13, // INTERNAL
          message: error.message || "Internal server error",
        });
      }
    },

    SetConfiguration: async (call, callback) => {
      try {
        const { profile_id, config_updates } = call.request;
        const profileInstance = await get_profile_instance();

        await profileInstance.configure(profile_id, config_updates);
        callback(null, {
          success: true,
          message: "Configuration updated successfully",
        });
      } catch (error) {
        callback({
          code: 13,
          message: error.message || "Failed to set configuration",
        });
      }
    },

    GetProfileConfig: async (call, callback) => {
      try {
        const { profile_id } = call.request;
        const profileInstance = await get_profile_instance();

        const configData = await profileInstance.getProfileConfig(profile_id);
        callback(null, {
          profile_id: profile_id,
          config: configData,
        });
      } catch (error) {
        callback({
          code: 13,
          message: error.message || "Failed to retrieve configuration",
        });
      }
    },
    UpdateProfile: async (call, callback) => {
      try {
        const { profile_id, config_updates } = call.request;
        const profile_instance = await get_profile_instance();
        const result = await profile_instance.updateProfile(
          profile_id,
          config_updates,
        );
        console.log(result);
        callback(null, {
          success: true,
          message: "Updated profile successfully.",
        });
      } catch (error) {
        callback({
          code: 13,
          message: error.message || "Failed to update the Profile",
        });
      }
    },
  };
})();

export default GRPCUserProfileService;
