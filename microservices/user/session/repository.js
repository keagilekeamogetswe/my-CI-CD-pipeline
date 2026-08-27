import { DeamonClient } from "../../grpc-clients/deamon";

const checkSessionFields = (session_config) => {
  const required_fields = [
    "jti",
    "user_id",
    "device_info",
    "ip_address",
    "created_at",
    "expires_at",
    "token_hash",
    "fp_hash",
  ];
  // Validate that all required fields are present in session_config
  Object.keys(session_config).forEach((key) => {
    if (!required_fields.includes(key)) {
      throw new Error(`Field not required: ${key}`);
    }
  });
  return true;
};
export const SessionRepository = (() => {
  return {
    save: async (session_config, mysql_connection) => {
      checkSessionFields(session_config);

      // build the query dynamically based on the session_config object
      const fields = Object.keys(session_config).join(", ");
      const values = Object.values(session_config);
      const values_placeholder = Object.keys(session_config)
        .map(() => "?")
        .join(", ");

      const query = `INSERT INTO user_session(${fields}) VALUES (${values_placeholder})`;
      try {
        const [result] = await mysql_connection.query(query, values);
        const { insertId } = result;
        if (insertId == undefined) {
          throw new Error("No affected rows");
        }
      } catch (err) {
        // Send as a background task to the deamon service to handle the session creation
        await DeamonClient.addJob("session.save", session_config);
      }
    },
    async find(jti, user_id, mysql_connection) {
      const query = "SELECT * FROM user_session WHERE jti = ? AND user_id;";
      const [result] = await mysql_connection.execute(query, [jti, user_id]);
      return result[0];
    },
    async rotate(
      { old_jti, new_jti, new_token_hash, new_expires_at, user_id },
      mysql_connection,
    ) {
      // 1. Revoke the old session
      const revoke_at = new Date()
        .toISOString()
        .substring(0, 19)
        .replace("T", " ");
      const revoke_query =
        "UPDATE user_session SET revoked_at = ?, expires_at = ? WHERE user_id = ? AND jti = ?";
      const [revokeResult] = await mysql_connection.execute(revoke_query, [
        revoke_at,
        revoke_at,
        user_id,
        old_jti,
      ]);

      if (!revokeResult.changedRows) {
        throw new Error("Failed to revoke old session");
      }

      // 2. Fetch old session details to carry over device_info, ip_address, fp_hash, session_type
      const [rows] = await mysql_connection.execute(
        "SELECT device_info, ip_address, fp_hash, session_type FROM user_session WHERE user_id = ? AND jti = ?",
        [user_id, old_jti],
      );
      const oldSession = rows[0];
      if (!oldSession) {
        throw new Error("Old session not found");
      }

      // 3. Insert new session row
      const created_at = new Date()
        .toISOString()
        .substring(0, 19)
        .replace("T", " ");
      const insert_query = `
          INSERT INTO user_session (user_id, jti, token_hash, device_info, ip_address, created_at, expires_at, fp_hash, session_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
      const [insertResult] = await mysql_connection.execute(insert_query, [
        user_id,
        new_jti,
        new_token_hash,
        oldSession.device_info,
        oldSession.ip_address,
        created_at,
        new_expires_at,
        oldSession.fp_hash,
        oldSession.session_type || "primary",
      ]);

      return insertResult.insertId ? true : false;
    },
    async revoke(user_id, jti, mysql_connection) {
      const revoke_at = new Date()
        .toISOString()
        .substring(0, 19)
        .replace("T", " ");
      const expires_at = new Date()
        .toISOString()
        .substring(0, 19)
        .replace("T", " ");

      const revoke_query =
        "UPDATE user_session SET revoked_at = ?, expires_at =? WHERE user_id = ? AND  jti = ?";
      const [result] = await mysql_connection.execute(revoke_query, [
        revoke_at,
        expires_at,
        user_id,
        jti,
      ]);
      return result.changedRows ? true : false;
    },
    async revokeAll(user_id, mysql_connection) {
      const revoke_at = new Date()
        .toISOString()
        .substring(0, 19)
        .replace("T", " ");
      const expires_at = new Date()
        .toISOString()
        .substring(0, 19)
        .replace("T", " ");

      const revoke_query =
        "UPDATE user_session SET revoked_at = ?, expires_at =? WHERE user_id = ?";
      const [result] = await mysql_connection.execute(revoke_query, [
        revoke_at,
        expires_at,
        user_id,
      ]);
      return result.changedRows ? true : false;
    },
  };
})();
