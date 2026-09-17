import { afterEach, beforeEach, describe, expect, it } from "vitest";
import argon2 from "argon2";

import { Database } from "../../../microservices/user/db";
import { CredentialsRepository } from "../../../microservices/user/credentials/repository";
import { AccountAuthToken } from "../../../microservices/user/user-flow/account.auth.tokens";
import { JWTHelper } from "../../../microservices/utility/jwt";

describe("Account authentication token tests", () => {
  let mysql_connection;
  let user_id;
  const payload = {
    device_info: "Chrome",
    finger_print: "device-fingerprint-123",
    ip_address: "127.0.0.1",
  };

  beforeEach(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();
    user_id = await CredentialsRepository.create(null, mysql_connection);
  });

  afterEach(async () => {
    try {
      await mysql_connection.rollback();
      await mysql_connection.close();
    } catch (error) {
      console.log("done");
    }
  });

  it("creates an encrypted refresh token and persists its session", async () => {
    const refresh_token = await AccountAuthToken.refresh.create(
      { ...payload, user_id },
      mysql_connection,
    );
    const { payload: token_payload } = await JWTHelper.decode(
      refresh_token,
      process.env.JWT_AUTH_REFRESH_TOKEN_SECRET,
    );
    const [[session]] = await mysql_connection.execute(
      "SELECT * FROM user_session WHERE jti = ?",
      [token_payload.jti],
    );

    expect(token_payload.user_id).toBe(user_id);
    expect(token_payload.device_info).toBe(payload.device_info);
    expect(token_payload.ip_address).toBe(payload.ip_address);
    expect(token_payload).not.toHaveProperty("finger_print");
    expect(session.user_id).toBe(user_id);
    expect(session.device_info).toBe(payload.device_info);
    expect(session.ip_address).toBe(payload.ip_address);
    expect(await argon2.verify(session.fp_hash, payload.finger_print)).toBe(
      true,
    );
    expect(await argon2.verify(session.token_hash, refresh_token)).toBe(true);
  });
  it("renew access token successfully", async () => {
    const old_refresh_token = await AccountAuthToken.refresh.create(
      { ...payload, user_id },
      mysql_connection,
    );

    const { access_token, refresh_token } = await AccountAuthToken.access.renew(
      old_refresh_token,
      mysql_connection,
    );
    console.log({ access_token, refresh_token });
    const payload_decoded = await JWTHelper.verify(
      access_token,
      process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY,
    );
    const old_refresh_payload = await JWTHelper.decode(
      old_refresh_token,
      process.env.JWT_AUTH_REFRESH_TOKEN_SECRET,
    );
    console.log(payload_decoded);
    expect(payload_decoded.payload).toBeDefined();
    expect(payload_decoded.payload.user_id).toBe(
      old_refresh_payload.payload.user_id,
    );
  });

  it("rejects a refresh-token payload with a required field missing", async () => {
    await expect(
      AccountAuthToken.refresh.create(
        {
          user_id,
          device_info: payload.device_info,
          ip_address: payload.ip_address,
        },
        mysql_connection,
      ),
    ).rejects.toThrow("Required field missing: finger_print");
  });
});
