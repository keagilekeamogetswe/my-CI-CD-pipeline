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
  let session_control = new SessionControl(mysql_connection)
  let mock_decoded_token
  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();
    session_control = new SessionControl(mysql_connection)
    const password_hash = await argon2.hash("secret123");
    // Insert a test dial_code so we can reference it
    const [{insertId}] = await mysql_connection.execute(
      "INSERT INTO user_credentials(password_hash) VALUES (?)",
      [password_hash]
    );
    user_id = insertId;

    const IPv4 =  "127.0.0.1";
    const [iat, exp] = [Date.now(),  Date.now() + (1000*60*60*24*20)]
    const format_date =  Date
    mock_decoded_token = {
      jti:"unique_jti",
      user_id,
      device_info:"Some device name",
      IPv4,
      fp_hash: "fingerprint has",
      iat,
      exp,
      token_hash: "token_hash"
    }

  });

  afterAll(async () => {
    if (mysql_connection) {
      await mysql_connection.rollback(); // rollback all test inserts
    }
  });

  it("should create an a session", async () => {
    const payload_copy = {...mock_decoded_token}
    const status = await session_control.saveSession(payload_copy);
    expect(status).toBeTruthy();
    const query_select = "SELECT * FROM user_session WHERE user_id = ?";
    const [[row]] = await mysql_connection.execute(query_select, [user_id]);
    expect(row.id).toBeDefined()
    expect(payload_copy.iat).toBeUndefined()
    expect(payload_copy.exp).toBeUndefined()
    expect(payload_copy.IPv4).toBeUndefined()
    //The payload_copy gets overwritten when its pass to  session_control.saveSession(payload_copy)
    // Values iat and exp and IPv4 get deleted and replace as follows
    expect(Date(row.expires_at)).toBe(Date(payload_copy.expires_at))
    expect(Date(row.created_at)).toBe(Date(payload_copy.created_at))
    expect(row.ip_address).toBe(payload_copy.ip_address)
    // Testing unchanged key
    expect(row.user_id).toBe(payload_copy.user_id)
    expect(row.jti).toBe(payload_copy.jti)
    expect(row.device_info).toBe(payload_copy.device_info)
    expect(row.fp_hash).toBe(payload_copy.fp_hash)

    //Testing the additional values we didnt include in the payload: payload_copy
    expect(row.session_type).toBe("primary")
    expect(row.revoked_at).toBeDefined()
  })
  it("Should revoke a specific session", async () => {
    const jti_to_removed = "remove jti";
    const jti_collection = ["jti_1", jti_to_removed, "Jti_3", "Jti_4"]

    for await (const jit of jti_collection){
      const payload_copy = {...mock_decoded_token}
      payload_copy.jti = jit;
      await session_control.saveSession(payload_copy)
    }
    // We're removing jti_to_removed
    const status = await session_control.revokeSession(user_id, jti_to_removed)
    //Seletect session of the user_id
    const select_query = "SELECT * FROM user_session WHERE user_id = ? AND jti= ?"
    const [[row]] = await mysql_connection.execute(select_query, [user_id, jti_to_removed])
    expect(status).toBe(true)
    expect(row.jti).toBeDefined()
    expect(Date(row.revoked_at)).toStrictEqual(Date(row.expires_at))

  })
  it("Should revoke all sessions for a specific user", async () => {
    //They previous test has only removed one session from the three it create on this one we will remove all of them them since they belong to one use
    //-----------------------------------
    //Seletect session of the user_id
    const select_query = "SELECT * FROM user_session WHERE user_id = ? AND revoked_at = NULL"
    const [before_rows] = await mysql_connection.execute(select_query, [user_id,])??[];
    // We're removing jti_to_removed
    const status = await session_control.EndAllSessions(user_id)

    const [rows] = await mysql_connection.execute(select_query, [user_id])??[];
    for(const [index, row] of Object.entries(rows)){
      expect(before_rows[index].revoked_at).toBeNull()
      expect(row.revoked_at).toStrictEqual(row.expires_at)
    }
    expect(status).toBe(true)
  })
});
