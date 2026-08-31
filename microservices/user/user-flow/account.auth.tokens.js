import { randomUUID } from "node:crypto";
import { JWTHelper } from "../../utility/jwt";
import argon2 from "argon2";
import { SessionRepository } from "../session/repository";
import {
  claimsFromDeviceContext,
  normalizeDeviceContext,
} from "../../utility/device.context.js";

export const AccountAuthToken = (() => {
  const refresh_key = process.env.JWT_AUTH_REFRESH_TOKEN_SECRET;
  const access_key =
    process.env.JWT_ACCESS_TOKEN_SECRET ||
    process.env.JWT_ACCESS_TOKEN_PUBLIC_KEY ||
    process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY;

  return {
    refresh: {
      async create(payload, mysql_connection) {
        const deviceContext = normalizeDeviceContext(payload.device_info, payload);
        const finger_print =
          deviceContext.webgl_fingerprint || payload.finger_print || payload.fp_hash;
        const required = {
          ip_address: deviceContext.ip_address,
          device_info: deviceContext.device_info,
          finger_print,
          user_id: payload.user_id,
        };

        Object.entries(required).forEach(([key, value]) => {
          if (value == null || value === "") {
            throw new Error(`Required field missing: ${key}`);
          }
        });

        const session_payload = {
          user_id: payload.user_id,
          device_info: deviceContext.device_info,
          ip_address: deviceContext.ip_address,
          fp_hash: await argon2.hash(finger_print),
        };
        const jti = randomUUID();
        session_payload.jti = jti;

        const now = new Date();
        const exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const refresh_claims = {
          user_id: payload.user_id,
          jti,
          ...claimsFromDeviceContext(deviceContext),
        };
        const refresh_token = await JWTHelper.encode(
          refresh_claims,
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
        const session = await SessionRepository.find(
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

        const deviceContext = normalizeDeviceContext(session.device_info, {
          ip_address: session.ip_address,
        });
        const new_session_payload = {
          user_id: session.user_id,
          jti: new_jti,
          ...claimsFromDeviceContext(deviceContext),
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
      async issueFromClaims(claims) {
        const access_exp = new Date(Date.now() + 3 * 60 * 1000);

        return await JWTHelper.encode(
          {
            user_id: claims.user_id,
            session_jti: claims.jti ?? claims.session_jti,
            ...claimsFromDeviceContext(claims),
          },
          access_exp,
          access_key,
        );
      },
      async issueFromRefreshToken(refresh_token) {
        const { payload } = await JWTHelper.decode(refresh_token, refresh_key);

        return await AccountAuthToken.access.issueFromClaims(payload);
      },
      async renew(refresh_token, mysql_connection) {
        // Rotate refresh token first
        const new_refresh_token = await AccountAuthToken.refresh.rotate(
          refresh_token,
          mysql_connection,
        );

        // Decode rotated refresh token to extract claims
        const access_token =
          await AccountAuthToken.access.issueFromRefreshToken(new_refresh_token);

        return { access_token, refresh_token: new_refresh_token }; // return both
      },
    },
  };
})();
