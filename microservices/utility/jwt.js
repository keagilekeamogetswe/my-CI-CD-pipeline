import * as jose from "jose";
import argon2 from "argon2";
import crypto from "crypto"


export const JWTHelper = (() => {
  return {
    encode: async (payload, exp, secret) => {
      const key = new TextEncoder().encode(secret);
      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setJti(crypto.randomUUID())
        .setExpirationTime(exp) // e.g. "2h" or numeric timestamp
        .sign(key);
      return jwt;
    },

    decode: async (jwtToken, secret) => {
      const key = new TextEncoder().encode(secret);
      const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, key);
      return { payload, protectedHeader };
    }
  };
})();
