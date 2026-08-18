import { afterEach, beforeEach, describe, expect, it } from "vitest";
import argon2 from "argon2";

import { Database } from "../../../microservices/user/db";
import { CredentialsRepository } from "../../../microservices/user/credentials/repository";
import { Login } from "../../../microservices/user/user-flow/account.log.in";
import { JWTHelper } from "../../../microservices/utility/jwt";

describe("User login flow tests", () => {
  let mysql_connection;
  let user_id;
  const password = "some strong password!";
  const device = {
    device_name: "Chrome",
    finger_print: "device-fingerprint-123",
    ip_address: "127.0.0.1",
  };

  beforeEach(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();

    const password_hash = await argon2.hash(password);
    user_id = await CredentialsRepository.create(password_hash, mysql_connection);
  });

  afterEach(async () => {
    try {
      await mysql_connection.rollback();
      await mysql_connection.close();
    } catch (error) {
      console.log("done");
    }
  });

  it("logs a user in with valid credentials", async () => {
    const refresh_token = await Login(
      user_id,
      password,
      JSON.stringify(device),
      mysql_connection,
    );

    expect(refresh_token).toEqual(expect.any(String));

    const { payload: token_payload } = await JWTHelper.decode(
      refresh_token,
      process.env.JWT_AUTH_REFRESH_TOKEN_SECRET,
    );
    const [[session]] = await mysql_connection.execute(
      "SELECT * FROM user_session WHERE jti = ?",
      [token_payload.jti],
    );

    expect(session).toBeDefined();
    expect(session.user_id).toBe(user_id);
    expect(session.jti).toBe(token_payload.jti);
    expect(session.device_info).toBe(device.device_name);
    expect(session.ip_address).toBe(device.ip_address);
    expect(session.revoked_at).toBeNull();
    expect(await argon2.verify(session.fp_hash, device.finger_print)).toBe(true);
    expect(await argon2.verify(session.token_hash, refresh_token)).toBe(true);
  });

  it("rejects an incorrect password without creating a session", async () => {
    await expect(
      Login(user_id, "incorrect password", JSON.stringify(device), mysql_connection),
    ).rejects.toThrow("Invalid credentials");

    const [[session]] = await mysql_connection.execute(
      "SELECT * FROM user_session WHERE user_id = ?",
      [user_id],
    );
    expect(session).toBeUndefined();
  });

  it("requires device info to be a string", async () => {
    await expect(
      Login(user_id, password, device, mysql_connection),
    ).rejects.toThrow("string is expected for device_info");
  });
});
