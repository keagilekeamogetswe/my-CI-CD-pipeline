import argon2 from "argon2";
import * as jose from "jose";
import { userCredentials } from "./../app/user/credentials";

describe("userCredentials helper", () => {
  let creds;

  beforeEach(() => {
    creds = userCredentials();
    creds.setCredentials("Alice", "user-1");
  });

  test("should hash and verify password correctly", async () => {
    await creds.updatePassword("", "initialPass"); // simulate setting password
    const ok = await creds.verify("initialPass");
    expect(ok).toBe(true);
  });

  test("should fail verification with wrong password", async () => {
    await creds.updatePassword("", "initialPass");
    const ok = await creds.verify("wrongPass");
    expect(ok).toBe(false);
  });

  test("should update password when old password matches", async () => {
    await creds.updatePassword("", "initialPass");
    const updated = await creds.updatePassword("initialPass", "newPass");
    expect(updated).toBe(true);

    const ok = await creds.verify("newPass");
    expect(ok).toBe(true);
  });

  test("should reject password update when old password is wrong", async () => {
    await creds.updatePassword("", "initialPass");
    const updated = await creds.updatePassword("wrongPass", "newPass");
    expect(updated).toBe(false);
  });

  test("should update username when password is correct", async () => {
    await creds.updatePassword("", "initialPass");
    const ok = await creds.updateUsername("Bob", "initialPass");
    expect(ok).toBe(true);
  });

  test("should reject username update when password is wrong", async () => {
    await creds.updatePassword("", "initialPass");
    const ok = await creds.updateUsername("Bob", "wrongPass");
    expect(ok).toBe(false);
  });

  test("should update password via JWT verification", async () => {
    // Create a fake OTP hash
    const otpPlain = "123456";
    const hashedOtp = await argon2.hash(otpPlain);

    // Sign JWT with jose
    const secret = new TextEncoder().encode("otp-secret");
    const jwt = await new jose.SignJWT({ hashed_otp: hashedOtp })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2m")
      .sign(secret);

    process.env.JWT_OTP_SECRET = "otp-secret";

    const ok = await creds.updateViaVerification(jwt, otpPlain);
    expect(ok).toBe(true);
  });
});
