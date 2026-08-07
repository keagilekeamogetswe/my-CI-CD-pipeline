import * as jose from "jose";
import crypto from "crypto";

export const JWTHelper = (() => {
  return {
    // Signed JWT (JWS) — integrity only
    sign: async (payload, exp, secret) => {
      const key = new TextEncoder().encode(secret);
      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setJti(crypto.randomUUID())
        .setExpirationTime(exp) // e.g. "2h" or numeric timestamp
        .sign(key);
      return jwt;
    },

    verify: async (jwtToken, secret) => {
      const key = new TextEncoder().encode(secret);
      const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, key);
      return { payload, protectedHeader };
    },

    // Encrypted JWT (JWE) — confidentiality + integrity
    encode: async (payload, exp, secretKey) => {
      // Derive a 32-byte key (Uint8Array/Buffer)
      const key = crypto.createHash("sha256").update(secretKey).digest();
      // secretKey must be a CryptoKey or Uint8Array generated with jose.generateSecret("A256GCM")
      const jwe = await new jose.EncryptJWT(payload)
        .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
        .setIssuedAt()
        .setJti(crypto.randomUUID())
        .setExpirationTime(exp)
        .encrypt(key);
      return jwe;
    },

    decode: async (jweToken, secretKey) => {
      // Derive a 32-byte key (Uint8Array/Buffer)
      const key = crypto.createHash("sha256").update(secretKey).digest();

      const { payload, protectedHeader } = await jose.jwtDecrypt(jweToken, key);
      return { payload, protectedHeader };
    }
  };
})();
