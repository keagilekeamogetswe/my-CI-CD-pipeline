import { describe, it, expect, beforeEach } from "vitest";
import { userCredentials } from "../../app/user/credentials.js";
import argon2 from "argon2";
import { JWTHelper } from "../../app/utility/jwt.js";
import dotenv from "dotenv";
dotenv.config({ path: "./tests/.env" });
describe.skip("userCredentials backend", () => {
  let creds;

  beforeEach(async () => {
    const password = "default";
    creds = userCredentials();
    await creds.setCredentials("Alice", "0", password);
  });

  it("hashes and verifies password correctly", async () => {
    expect(true).toBe(await creds.verify("default"));
  });
  it("updates password correctly", async () => {
    const new_password = "new_password";
    expect(true).toBe(await creds.updatePassword("default", new_password));
    expect(true).toBe(await creds.verify(new_password));
  });
  it("fails to update password with wrong old password", async () => {
    const new_password = "new_password";
    expect(false).toBe(
      await creds.updatePassword("wrong_old_password", new_password),
    );
  });
  it("updates username correctly", async () => {
    const new_username = "Bob";
    expect(true).toBe(await creds.updateUsername(new_username, "default"));
  });
  it("fails to update username with wrong password", async () => {
    const new_username = "Bob";
    expect(false).toBe(
      await creds.updateUsername(new_username, "wrong_password"),
    );
  });
  it("verifies contact correctly ", async () => {
    const { jwt, otp } = await creds.requestVerification({
      dial_code_id: 0,
      body: "1234567890",
    });

    const verification_status = await creds.updateViaVerification(jwt, otp);
    expect(true).toBe(verification_status);
  });
});
