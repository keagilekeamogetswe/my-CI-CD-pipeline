import { randomUUID } from "node:crypto";
import { JWTHelper } from "../../utility/jwt";
import argon2 from "argon2";
import { SessionRepository } from "../session/repository";

export const AccountAuthToken = (() => {
  const refresh_key = process.env.JWT_AUTH_REFRESH_TOKEN_SECRET;

  return {
    refresh: {
      async create(payload, mysql_connection) {
        const session_payload = {};
        const required = [
          "ip_address",
          "device_info",
          "finger_print",
          "user_id",
        ];
        // Keep only the values required to create a session.
        Object.keys(payload).forEach((key) => {
          if (required.includes(key)) {
            session_payload[key] = payload[key];
          }
        });
        required.forEach((key) => {
          if (session_payload[key] == null || session_payload[key] === "") {
            throw new Error(`Required field missing: ${key}`);
          }
        });

        const fp_hash = await argon2.hash(session_payload.finger_print);
        delete session_payload.finger_print;
        session_payload.fp_hash = fp_hash;

        const jti = randomUUID();
        session_payload.jti = jti;

        const now = new Date();
        const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const refresh_token = await JWTHelper.encode(
          session_payload,
          exp,
          refresh_key,
        );

        const token_hash = await argon2.hash(refresh_token);
        session_payload.created_at = now;
        session_payload.expires_at = exp;
        session_payload.token_hash = token_hash;

        await SessionRepository.save(session_payload, mysql_connection);

        return refresh_token;
      },

      async rotate(jwe_refresh_token, mysql_connection) {
        // Decode inbound JWE token
        const { payload } = await JWTHelper.decode(
          jwe_refresh_token,
          refresh_key,
        );
        const { user_id, jti } = payload;

        if (!user_id || !jti) {
          throw new Error("Invalid refresh token payload");
        }

        // Fetch session and check active status
        const session = await SessionRepository.findByJti(
          jti,
          user_id,
          mysql_connection,
        );
        if (!session || session.revoked_at !== null) {
          throw new Error("Session is invalid or has been revoked");
        }

        if (new Date(session.expires_at).getTime() < Date.now()) {
          throw new Error("Session has expired");
        }

        // Verify presented token against stored Argon2 hash
        const isValid = await argon2.verify(
          session.token_hash,
          jwe_refresh_token,
        );
        if (!isValid) {
          // Potential token reuse/compromise -> revoke session
          await SessionRepository.revoke(user_id, jti, mysql_connection);
          throw new Error("Token mismatch. Session revoked for security.");
        }

        // 4. Generate new session claims & JTI
        const new_jti = randomUUID();
        const now = new Date();
        const new_exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const new_session_payload = {
          user_id: session.user_id,
          device_info: session.device_info,
          ip_address: session.ip_address,
          fp_hash: session.fp_hash,
          jti: new_jti,
        };

        const new_refresh_token = await JWTHelper.encode(
          new_session_payload,
          new_exp,
          refresh_key,
        );

        const new_token_hash = await argon2.hash(new_refresh_token);

        // 5. Atomically update session in DB
        const rotated = await SessionRepository.rotate(
          {
            old_jti: jti,
            new_jti,
            new_token_hash,
            new_expires_at: new_exp,
            user_id,
          },
          mysql_connection,
        );

        if (!rotated) {
          throw new Error("Failed to rotate session record");
        }

        return new_refresh_token;
      },
    },

    access: {
      async renew(refresh_token, mysql_connection) {
        // Rotate refresh token first
        const new_refresh_token = await AccountAuthToken.refresh.rotate(
          refresh_token,
          mysql_connection,
        );

        // Decode rotated refresh token to extract claims
        const { payload } = await JWTHelper.decode(
          new_refresh_token,
          refresh_key,
        );

        // Issue new access token (short-lived, signed with private key)
        const access_exp = new Date(Date.now() + 3 * 60 * 1000);
        return await JWTHelper.sign(
          { user_id: payload.user_id, fp_hash: payload.fp_hash },
          access_exp,
          process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY,
        );
      },
    },
  };
})();
