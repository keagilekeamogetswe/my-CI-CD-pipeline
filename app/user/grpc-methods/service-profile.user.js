import { Database } from "./../db.js";
import { UserProfile } from "./../profile.js";

const GRPCUserProfileService = (() => {
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
        const {
          user_id,
          name,
          email,
          dob,
          phone,
          bio,
          lastname,
          profile_picture,
        } = call.request;

        const profileInstance = await get_profile_instance();

        const [header] = await profileInstance.initialise(
          user_id,
          name,
          lastname,
          dob,
          phone,
          profile_picture,
          bio,
        );

        const { insertId } = header;

        if (insertId) {
          callback(null, {
            success: true,
            profile_id: String(insertId),
            message: "Profile initialised successfully",
          });
        } else {
          callback(null, {
            success: false,
            profile_id: "",
            message: "Failed to initialise profile",
          });
        }
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
