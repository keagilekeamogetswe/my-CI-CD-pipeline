import * as jose from "jose";
import crypto from "crypto";

export const JWTHelper = (() => {
  return {
    // Signed JWT (JWS) — integrity only
    sign: async (payload, exp, privateKeyPem) => {
      // Convert PEM private key to CryptoKey
      const privateKey = await jose.importPKCS8(privateKeyPem, "RS256");

      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setJti(payload.jti ?? crypto.randomUUID())
        .setExpirationTime(exp) 
        .sign(privateKey);

      return jwt;
    },

    verify: async (jwtToken, publicKeyPem) => {
      // Convert PEM public key to CryptoKey
      const publicKey = await jose.importSPKI(publicKeyPem, "RS256");

      const { payload, protectedHeader } = await jose.jwtVerify(jwtToken, publicKey, {
        algorithms: ["RS256"],
      });

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
        .setJti(payload.jti ?? crypto.randomUUID())
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
