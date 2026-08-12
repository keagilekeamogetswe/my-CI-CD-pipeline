import crypto from "crypto"
import { CredentialsRepository } from "../../credentials/repository.js"

export const setNewPasswordToken = (() => {
  const table = "password_reset_tokens";

  return {
    async generateOpaque(user_id, verification_id, mysql_connection) {
      // Generate 32-byte secure random token (64 hex chars)
      const rawToken = crypto.randomBytes(32).toString("hex");

      // SHA-256 deterministic hash for database storage & fast lookup
      const token_hash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const expires_at_date = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
      const expires_at = expires_at_date.toISOString().slice(0, 19).replace("T", " ");

      const query = `
        INSERT INTO ${table} (user_id, verification_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?);
      `;

      const [result] = await mysql_connection.execute(query, [
        user_id,
        verification_id,
        token_hash,
        expires_at,
      ]);

      return {
        token: rawToken,
        token_id: result.insertId,
      };
    },

    async redeemOpaque(user_id, token_id, rawToken, new_password, mysql_connection) {
      const incomingHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const selectQuery = `
        SELECT id
        FROM ${table}
        WHERE id = ? AND user_id = ? AND token_hash = ? AND used = FALSE AND expires_at > NOW();
      `;

      const [[record]] = await mysql_connection.execute(selectQuery, [token_id, user_id, incomingHash]);

      if (!record) {
        throw new Error("Invalid, expired, or previously used reset token.");
      }

      // Execute password change and token consumption in a single transaction
      await mysql_connection.beginTransaction();
      try {
        await CredentialsRepository.changePassword(user_id, new_password, mysql_connection);

        const updateTokenQuery = `
          UPDATE ${table}
          SET used = TRUE, used_at = NOW()
          WHERE id = ?;
        `;
        await mysql_connection.execute(updateTokenQuery, [record.id]);

        await mysql_connection.commit();
        return true;
      } catch (error) {
        await mysql_connection.rollback();
        throw error;
      }
    },
  };
})();