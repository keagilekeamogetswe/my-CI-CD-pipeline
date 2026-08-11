import crypto from "crypto";
import argon2 from "argon2";
import Verification from "../../verification/control";
import { PASS_RESET_METHOD } from "./constant";
import { CredentialsRepository } from "../../credentials/repository";

const table = "password_reset_verifications";

export class ResetPasswordVerificationRequest {
  method;
  mysql_connection;

  constructor(method, mysql_connection) {
    this.method = method;
    this.mysql_connection = mysql_connection;
    if (!Object.values(PASS_RESET_METHOD).includes(method)) {
      throw new Error(`Reset via "${method}" method is not allowed`);
    }
  }

  async run(user_id) {
    let query_to_search_contact;
    if (this.method === PASS_RESET_METHOD.EMAIL) {
      query_to_search_contact = `
        SELECT email
        FROM user_emails
        WHERE user_id = ?;
      `;
    } else if (this.method === PASS_RESET_METHOD.PHONE) {
      query_to_search_contact = `
        SELECT
          p.body AS body,
          p.dial_code_id AS dial_code_id,
          d.dial_code AS code
        FROM phone_numbers p
        INNER JOIN dial_codes d ON p.dial_code_id = d.id
        WHERE p.initiated_by = ?;
      `;
    } else {
      throw new Error(`Action for specified method not registered: ${this.method}`);
    }

    const [[contact]] = await this.mysql_connection.execute(query_to_search_contact, [user_id]);
    console.log({contact})
    if (!contact || Object.keys(contact).length === 0) {
      throw new Error(`No ${this.method} contact associated with user_id ${user_id}!`);
    }

    const jti = crypto.randomUUID();
    const request_payload = { user_id, jti };

    if (this.method === PASS_RESET_METHOD.EMAIL) {
      request_payload.email = contact.email;
    } else {
      request_payload.phone = { ...contact };
    }

    const token = await Verification.request(request_payload, this.method);

    const expires_at_date = new Date(Date.now() + 1000 * 60 * 2); // 2 minutes
    const expires_at = expires_at_date.toISOString().slice(0, 19).replace("T", " ");

    const request_token_hash = await argon2.hash(token);

    const query = `
      INSERT INTO password_reset_verifications (
        user_id,
        jti,
        verification_token_hash,
        method,
        expires_at
      ) VALUES (?, ?, ?, ?, ?);
    `;

    const [result] = await this.mysql_connection.execute(query, [
      user_id,
      jti,
      request_token_hash,
      this.method,
      expires_at,
    ]);

    return (result.insertId && token) ?? result.affectedRows > 0;
  }
}
