import profileDefaults from "../config/profile.defaults.js";

const allowedFields = ["name", "lastname", "bio", "profile_picture"];

const isObject = (value) =>
  value != null && typeof value === "object" && !Array.isArray(value);

const flattenDelta = (value, prefix = "", result = {}) => {
  Object.entries(value).forEach(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isObject(nested)) {
      flattenDelta(nested, path, result);
      return;
    }

    result[path] = nested;
  });

  return result;
};

const getValueByPath = (source, path) =>
  path.split(".").reduce((value, part) => value?.[part], source);

const deepMerge = (base, override) => {
  if (!isObject(base) || !isObject(override)) {
    return override;
  }

  const merged = { ...base };

  Object.entries(override).forEach(([key, value]) => {
    merged[key] = isObject(value)
      ? deepMerge(isObject(merged[key]) ? merged[key] : {}, value)
      : value;
  });

  return merged;
};

export const ProfileRepository  = (()=>{
  return{
    create: async({name, lastname, dob, user_id, phone_id }, mysql_connection)=>{
      const [profile_result] = await mysql_connection.execute(
        `INSERT INTO user_profiles(name, lastname, dob, user_id, phone_id)
         VALUES (?, ?, ?, ?, ?)`,
        [name, lastname, dob, user_id, phone_id]
      );
      const profile_id = profile_result.insertId;
      return profile_id;
    },
    change: async(user_id, updates, mysql_connection)=>{
      Object.keys(updates).forEach(field =>{
        if (!allowedFields.includes(field)) {
          throw new Error(`Field '${field}' is not allowed for update`);
        }
      });
      const setClause = Object.keys(updates).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(user_id);

      const [result] = await mysql_connection.execute(
        `UPDATE user_profiles SET ${setClause} WHERE user_id = ?`,
        values
      );
      return result.affectedRows > 0;
    },
    patchConfig:async(user_id, config, mongo_connection)=>{
      const flattenedConfig = flattenDelta(config);
      const update = {
        $setOnInsert: { user_id },
      };
      const $set = {};
      const $unset = {};

      Object.entries(flattenedConfig).forEach(([path, value]) => {
        const mongoPath = `settings.${path}`;
        const defaultValue = getValueByPath(profileDefaults, path);

        if (value === undefined || Object.is(value, defaultValue)) {
          $unset[mongoPath] = "";
          return;
        }

        $set[mongoPath] = value;
      });

      if (Object.keys($set).length > 0) {
        update.$set = $set;
      }
      if (Object.keys($unset).length > 0) {
        update.$unset = $unset;
      }
      if (!update.$set && !update.$unset) {
        return {
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0,
        };
      }

      return await mongo_connection.updateOne({ user_id }, update, {
        upsert: true,
      });
    },
    getMergedConfig: async(user_id, mongo_connection)=>{
      const document = await mongo_connection.findOne({ user_id });
      return deepMerge(profileDefaults, document?.settings ?? {});
    }
  }
})()