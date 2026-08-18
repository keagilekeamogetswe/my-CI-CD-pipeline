import crypto from "crypto";
import argon2 from "argon2";
import { CredentialsRepository } from "../../credentials/repository.js";

export const setNewPasswordToken = (() => {
  const table = "password_reset_tokens";

  return {
    async generateOpaque(
      user_id,
      verification_id,
      device_info,
      mysql_connection
    ) {
      if (typeof device_info !== "string") {
        throw new Error(
          `device_info is expected to be a string but got ${typeof device_info}`
        );
      }

      const rawToken = crypto.randomBytes(32).toString("hex");

      const token_hash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      const device_info_hash = await argon2.hash(device_info);

      const expires_at = new Date(Date.now() + 15 * 60 * 1000);

      const query = `
        INSERT INTO ${table} (
          user_id,
          verification_id,
          token_hash,
          device_info_hash,
          expires_at
        )
        VALUES (?, ?, ?, ?, ?);
      `;

      const [result] = await mysql_connection.execute(query, [
        user_id,
        verification_id,
        token_hash,
        device_info_hash,
        expires_at,
      ]);

      return {
        token: rawToken,
        token_id: result.insertId,
      };
    },

    async redeemOpaque(
      user_id,
      token_id,
      rawToken,
      new_password,
      device_info,
      mysql_connection
    ) {
      if (typeof device_info !== "string") {
        throw new Error(
          `device_info is expected to be a string but got ${typeof device_info}`
        );
      }

      const incomingHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      const selectQuery = `
        SELECT id, device_info_hash
        FROM ${table}
        WHERE id = ?
          AND user_id = ?
          AND token_hash = ?
          AND used = FALSE
          AND expires_at > NOW()
        LIMIT 1;
      `;

      const [[record]] = await mysql_connection.execute(
        selectQuery,
        [token_id, user_id, incomingHash]
      );

      if (!record) {
        throw new Error(
          "Invalid, expired, or previously used reset token."
        );
      }

      const deviceMatches = await argon2.verify(
        record.device_info_hash,
        device_info
      );

      if (!deviceMatches) {
        throw new Error(
          "Current device info does not match reset token's device info"
        );
      }

      await mysql_connection.beginTransaction();

      try {
        await CredentialsRepository.changePassword(
          user_id,
          new_password,
          mysql_connection
        );

        const updateTokenQuery = `
          UPDATE ${table}
          SET used = TRUE,
              used_at = NOW()
          WHERE id = ?
            AND used = FALSE;
        `;

        const [updateResult] = await mysql_connection.execute(
          updateTokenQuery,
          [record.id]
        );

        if (updateResult.affectedRows !== 1) {
          throw new Error(
            "Reset token has already been consumed."
          );
        }

        await mysql_connection.commit();

        return true;
      } catch (error) {
        await mysql_connection.rollback();
        throw error;
      }
    },
  };
})();