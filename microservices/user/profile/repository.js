import defualt_profile_config from "../config/profile.defaults";

/**
 * Repository module handling profile data persistence across MySQL and MongoDB.
 */
export const ProfileRepository = (() => {
  return {
    /**
     * Creates a new user profile record in MySQL.
     *
     * @param {Object} profileData - Profile details to create.
     * @param {string} profileData.name - First name of the user.
     * @param {string} profileData.lastname - Last name of the user.
     * @param {string|Date} profileData.dob - Date of birth.
     * @param {number|string} profileData.user_id - Associated user ID.
     * @param {number|string} profileData.phone_id - Associated phone ID.
     * @param {Object} mysql_connection - Active MySQL database connection.
     * @returns {Promise<number>} ID of the newly inserted profile record.
     */
    create: async (
      { name, lastname, dob, user_id, phone_id },
      mysql_connection,
    ) => {
      const [profile_result] = await mysql_connection.execute(
        `INSERT INTO user_profiles(name, lastname, dob, user_id, phone_id)
         VALUES (?, ?, ?, ?, ?)`,
        [name, lastname, dob, user_id, phone_id],
      );
      const profile_id = profile_result.insertId;
      return profile_id;
    },

    /**
     * Updates editable fields of an existing user profile in MySQL.
     *
     * @param {number|string} user_id - The ID of the user whose profile is being changed.
     * @param {Object} updates - Key-value pairs of fields to update.
     * @param {Object} mysql_connection - Active MySQL database connection.
     * @returns {Promise<boolean>} True if at least one row was updated, false otherwise.
     * @throws {Error} If any field in updates is not allowed.
     */
    change: async (user_id, updates, mysql_connection) => {
      const allowedFields = ["name", "lastname", "bio", "profile_picture"];
      // check if updates contain only allowed fields
      Object.keys(updates).forEach((field) => {
        if (!allowedFields.includes(field)) {
          throw new Error(`Field '${field}' is not allowed for update`);
        }
      });
      // Build the SET clause dynamically based on the updates object
      const setClause = Object.keys(updates)
        .map((field) => `${field} = ?`)
        .join(", ");
      const values = Object.values(updates);
      values.push(user_id);

      const [result] = await mysql_connection.execute(
        `UPDATE user_profiles SET ${setClause} WHERE user_id = ?`,
        values,
      );
      return result.affectedRows > 0;
    },

    /**
     * Updates or unsets custom profile configuration settings in MongoDB.
     *
     * @param {number|string} profile_id - Associated profile ID.
     * @param {Object} config_updates - Configuration key-value overrides.
     * @param {Object} mongo_connection - Active MongoDB collection/connection reference.
     * @returns {Promise<Object>} MongoDB update operation result.
     * @throws {Error} If any key in config_updates is not a recognized configuration field.
     */
    configure: async (profile_id, config_updates, mongo_connection) => {
      // check if the config_updates contain only allowed fields and separate them into updateOps and unsetOps
      const updateOps = {};
      const unsetOps = {};
      for (const [key, value] of Object.entries(config_updates)) {
        if (defualt_profile_config[key] === undefined) {
          throw new Error(`Field '${key}' is not allowed for configuration`);
        }
        if (defualt_profile_config[key] === value) {
          unsetOps[`settings.${key}`] = "";
        } else {
          updateOps[`settings.${key}`] = value;
        }
      }

      const updateDoc = {};
      if (Object.keys(updateOps).length) {
        updateDoc.$set = updateOps;
      }
      if (Object.keys(unsetOps).length) {
        updateDoc.$unset = unsetOps;
      }

      if (Object.keys(updateDoc).length === 0) {
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      }

      return await mongo_connection.updateOne(
        { profile: String(profile_id) },
        updateDoc,
        { upsert: true },
      );
    },

    /**
     * Retrieves the profile configuration from MongoDB merged with defaults.
     *
     * @param {number|string} profile_id - Associated profile ID.
     * @param {Object} mongo_connection - Active MongoDB collection/connection reference.
     * @returns {Promise<Object>} The resolved profile configuration object.
     */
    getConfig: async (profile_id, mongo_connection) => {
      const doc = await mongo_connection.findOne({ profile: String(profile_id) });
      return {
        ...defualt_profile_config,
        ...(doc?.settings || {}),
      };
    },
  };
})();
