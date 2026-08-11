import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach} from "vitest";
import argon2 from "argon2";
import * as crypto from "node:crypto";

import { Notification } from "../../../microservices/utility/notifications";

// Mock notifications
vi.mock("../../../microservices/utility/notifications", () => ({
  Notification: {
    Email: {
      send: vi.fn().mockResolvedValue(true),
    },
    SMS: {
      send: vi.fn().mockResolvedValue(true),
    },
  },
}));
// Mock randInt for predictable outcome
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual("node:crypto");

  return {
    ...actual,
    randomInt: vi.fn(() => "123456789"),
  };
});
import {AccountCreation} from "../../../microservices/user/user-flow/account.creation"
import { Database } from "../../../microservices/user/db";
import { JWTHelper } from "../../../microservices/utility/jwt";
import { setTimeout } from "node:timers";
import { CredentialsRepository } from "../../../microservices/user/credentials/repository";
import { resetWithCurrentPassword } from "../../../microservices/user/user-flow/password-reset/verification.with.cpass";
import { AccountPasswordReset } from "../../../microservices/user/user-flow/Account.password";
import { PASS_RESET_METHOD } from "../../../microservices/user/user-flow/password-reset/constant";

describe("User Creation flow tests",()=>{
    let mysql_connection;
    let dial_code_id;
    let user_pass = "some strong password!"
    let user_id;

    beforeEach(async () => {
      mysql_connection = await Database.getSQLConnection();

      await mysql_connection.beginTransaction();

      // Create or get test dial code for phone number creation
      await mysql_connection.execute(
        `
        INSERT IGNORE INTO dial_codes (abrv, dial_code, country)
        VALUES (?, ?, ?)
        `,
        ["ZAR", "27", "South Africa"]
      );

      const [[dialCode]] = await mysql_connection.execute(
        "SELECT id FROM dial_codes WHERE abrv = ?",
        ["ZAR"]
      );
      dial_code_id = dialCode.id;
      const hashed_pass = await argon2.hash(user_pass)
      user_id = await CredentialsRepository.create(hashed_pass, mysql_connection)
    });

    afterEach(async () => {
      try {
        await mysql_connection.rollback();
        await mysql_connection.close();

      } catch(error) {
        console.log("done")
      }
    });
  it("Requesting a password reset with email",async ()=>{
    const phone = {code: "27", dial_code_id: dial_code_id , body: "123456789"}
    const new_pass = "new password"
    const has_reset = await resetWithCurrentPassword(user_id, user_pass, new_pass, mysql_connection)

    const query = "SELECT * FROM user_credentials WHERE id = ?"
    const [[result]] = await mysql_connection.execute(query, [user_id])
    const verified = await argon2.verify(result.password_hash, new_pass)
    expect(verified).toBe(true)
    expect(has_reset).toBeTruthy()
  })
  it("Requesting a password reset with phone",async ()=>{
    const phone = {code: "27", dial_code_id: dial_code_id , body: "123456789"}
    const new_pass = "new password"
    //Link to phone
    await CredentialsRepository.linkPhone(user_id, phone, mysql_connection)
    // Get the token
    const token = await AccountPasswordReset.requestSMS(user_id, mysql_connection)
    //
    const reset_request_query = "SELECT * FROM password_reset_verifications WHERE user_id= ?"
    const [[password_reset_request_data]] = await mysql_connection.execute(reset_request_query, [user_id]);
    expect(password_reset_request_data.confirmed_at).toBeNull()
    expect(password_reset_request_data.confirmed).toBeFalsy()
    expect(password_reset_request_data.method).toBe(PASS_RESET_METHOD.PHONE)
    expect(password_reset_request_data).toHaveProperty('jti')
    const opaque_data = await AccountPasswordReset.confirm(user_id, token, '123456789', mysql_connection)
    const opaque_token = opaque_data.token
    const opaque_id  = opaque_data.token_id
    const opaque_query = "SELECT * FROM password_reset_tokens WHERE id= ?"
    const [[registered_reset_opaque_data]] = await mysql_connection.execute(opaque_query, [opaque_id]);
    expect(registered_reset_opaque_data.used).toBeFalsy(0)
    expect(registered_reset_opaque_data.used_at).toBeNullable(0)
    expect(registered_reset_opaque_data).toHaveProperty('verification_id')
    const has_reset_successfully = await AccountPasswordReset.resetPassword(user_id, opaque_id, opaque_token, new_pass, mysql_connection)
    const [[confirmed_reset_opaque_data]] = await mysql_connection.execute(opaque_query, [opaque_id]);
    expect(confirmed_reset_opaque_data.used).toBeTruthy()
    expect(confirmed_reset_opaque_data.used_at).toBeTruthy(0)
    expect(confirmed_reset_opaque_data).toHaveProperty('verification_id')
  })
  it("Requesting a password reset with email",async ()=>{
    const email = "test@testhubs.test"
    const new_pass = "new password"
    //Link to phone
    await CredentialsRepository.linkEmail(user_id, email, mysql_connection)
    // Get the token
    const token = await AccountPasswordReset.requestEmail(user_id, mysql_connection)
    //
    const reset_request_query = "SELECT * FROM password_reset_verifications WHERE user_id= ?"
    const [[password_reset_request_data]] = await mysql_connection.execute(reset_request_query, [user_id]);
    expect(password_reset_request_data.confirmed_at).toBeNull()
    expect(password_reset_request_data.confirmed).toBeFalsy()
    expect(password_reset_request_data.method).toBe(PASS_RESET_METHOD.EMAIL)
    expect(password_reset_request_data).toHaveProperty('jti')
    const opaque_data = await AccountPasswordReset.confirm(user_id, token, '123456789', mysql_connection)
    const opaque_token = opaque_data.token
    const opaque_id  = opaque_data.token_id
    const opaque_query = "SELECT * FROM password_reset_tokens WHERE id= ?"
    const [[registered_reset_opaque_data]] = await mysql_connection.execute(opaque_query, [opaque_id]);
    expect(registered_reset_opaque_data.used).toBeFalsy(0)
    expect(registered_reset_opaque_data.used_at).toBeNullable(0)
    expect(registered_reset_opaque_data).toHaveProperty('verification_id')
    const has_reset_successfully = await AccountPasswordReset.resetPassword(user_id, opaque_id, opaque_token, new_pass, mysql_connection)
    const [[confirmed_reset_opaque_data]] = await mysql_connection.execute(opaque_query, [opaque_id]);
    expect(confirmed_reset_opaque_data.used).toBeTruthy()
    expect(confirmed_reset_opaque_data.used_at).toBeTruthy(0)
    expect(confirmed_reset_opaque_data).toHaveProperty('verification_id')
  })
})