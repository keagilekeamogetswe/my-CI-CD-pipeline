import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import { Database } from "../../../../../app/user/db.js";
import initialiseUserAccount from "../../../../../app/user/Repository/Logic/initialise.user.js";
import argon2 from "argon2";
import dotenv from "dotenv";
import SessionControl from "../../../../../app/user/Repository/Logic/Session.Control.js";

dotenv.config({ path: "./tests/.env" });


describe("UserRepository: Testing Session control on DB ", () => {
  let mysql_connection;
  let dial_code_id;
  let user_id;
  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();
    const password_hash = await argon2.hash("secret123");
    // Insert a test dial_code so we can reference it
    const [{insertId}] = await mysql_connection.execute(
      "INSERT INTO user_credentials(password_hash) VALUES (?)",
      [password_hash]
    );
    user_id = insertId;

  });

  afterAll(async () => {
    if (mysql_connection) {
      await mysql_connection.rollback(); // rollback all test inserts
    }
  });

  it("should create an a session", async () => {
    const session_control = new SessionControl(mysql_connection)
    const IPv4 =  "127.0.0.1";
    const [iat, exp] = [Date.now(),  Date.now() + (1000*60*60*24*20)]
    const format_date =  Date
    const mock_decoded_token = {
      jti:"unique_jti",
      user_id,
      device_info:"Some device name",
      IPv4,
      fp_hash: "fingerprint has",
      iat,
      exp,
      token_hash: "token_hash"
    }
    const status = await session_control.saveSession(mock_decoded_token);
    expect(status).toBeTruthy();
    const query_select = "SELECT * FROM user_session WHERE user_id = ?";
    const [[row]] = await mysql_connection.execute(query_select, [user_id]);
    expect(row.id).toBeDefined()
    expect(mock_decoded_token.iat).toBeUndefined()
    expect(mock_decoded_token.exp).toBeUndefined()
    expect(mock_decoded_token.IPv4).toBeUndefined()
    //The mock_decoded_token gets overwritten when its pass to  session_control.saveSession(mock_decoded_token)
    // Values iat and exp and IPv4 get deleted and replace as follows
    expect(Date(row.expires_at)).toBe(Date(mock_decoded_token.expires_at))
    expect(Date(row.created_at)).toBe(Date(mock_decoded_token.created_at))
    expect(row.ip_address).toBe(IPv4)
    // Testing unchanged key
    expect(row.user_id).toBe(mock_decoded_token.user_id)
    expect(row.jti).toBe(mock_decoded_token.jti)
    expect(row.device_info).toBe(mock_decoded_token.device_info)
    expect(row.fp_hash).toBe(mock_decoded_token.fp_hash)

    //Testing the additional values we didnt include in the payload: mock_decoded_token
    expect(row.session_type).toBe("primary")
    expect(row.revoked_at).toBeDefined()
  })
});
