import crypto from "crypto";
import argon2 from "argon2";
import Verification from "../../verification/control";
import { PASS_RESET_METHOD } from "./constant";
import { CredentialsRepository } from "../../credentials/repository";
import {setNewPasswordToken} from "./set.password.token"
export class ResetPasswordVerificationConfirmation {
  mysql_connection;
  constructor( mysql_connection) {
    this.mysql_connection = mysql_connection;
  }

  async run(user_id, token, otp) {
    const payload = await Verification.confirm(token, otp); // Throws if invalid

    if (payload.user_id !== user_id) {
      throw new Error("User IDs do not match!");
    }

    // Verify verification window is still valid and unconfirmed
    const query = `
      SELECT id, verification_token_hash
      FROM password_reset_verifications
      WHERE expires_at > NOW() AND user_id = ? AND jti = ? AND confirmed = FALSE;
    `;
    const [[result]] = await this.mysql_connection.execute(query, [user_id, payload.jti]);

    if (!result) {
      throw new Error("No active verification window open for the specified JTI");
    }

    // Argon2 verification: verify(hash, plainText)
    const isValidToken = await argon2.verify(result.verification_token_hash, token);
    if (!isValidToken) {
      throw new Error("Token hash could not be verified against the supplied token!");
    }

    // Mark verification request as confirmed in DB
    const updateConfirmationQuery = `
      UPDATE password_reset_verifications
      SET confirmed = TRUE, confirmed_at = NOW()
      WHERE user_id = ? AND jti = ?;
    `;
    const [updateResult] = await this.mysql_connection.execute(updateConfirmationQuery, [user_id, payload.jti]);

    if (updateResult.affectedRows === 0) {
      console.warn("No rows updated during verification confirmation");
    }
    // Issue opaque token for password reset session
    return await setNewPasswordToken.generateOpaque(user_id, result.id, this.mysql_connection);
  }
}
