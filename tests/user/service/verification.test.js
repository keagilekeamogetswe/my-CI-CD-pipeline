import { describe, it, expect, vi, beforeEach } from "vitest";
import argon2 from "argon2";
import { JWTHelper } from "./../../../app/utility/jwt";
import Verification from "./../../../app/user/services/Verification";
import dotenv from "dotenv";

// Load environment variables for the test suite
dotenv.config({ path: "./tests/.env" });

// Mock argon2 hashing utility
vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(async (value) => `hashed_${value}`),
    verify: vi.fn(async (hash, value) => hash === `hashed_${value}`),
  },
}));



describe("Verification", () => {
  let verification;
  let current_code;

  beforeEach(() => {
    const SMSService = {
      send: vi.fn(async (phone) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        let code = "";
        let max_loop = 10;
        let count = 0;
        while (count < max_loop) {
          count++;
          let run = true;
          const rand_digit = Math.floor(Math.random() * 9);
          if (!code && rand_digit === 0) {
            continue;
          }
          if (code.length == 6) {
            break;
          }
          code += rand_digit;
        }
        current_code = code;
        console.log("OPT Code: ", code);
        return {
          success: true,
          otp: code,
        };
      }),
    };
    const EmailService = {};
    verification = new Verification(SMSService, EmailService);
  });

  it("should request a verification code", async () => {
    const token = await verification.requestUserCreationVerificationCode(
      "John",
      "Doe",
      {
        dial_code_id: 27,
        phone_body: "821234567",
        phone_full: "+27821234567",
      },
      "1990-01-01",
      "127.0.0.1",
    );
    console.log(current_code);
    expect(token).toBeDefined();
    expect(argon2.hash).toHaveBeenCalledTimes(2);
  });

  it("should confirm a verification code", async () => {
    const IPv4 = "127.0.0.1";

    const token = await verification.requestUserCreationVerificationCode(
      "Kati",
      "Bee",
      {
        dial_code_id: 1,
        phone_body: "222222",
        phone_full: "+(1) 222-222",
      },
      "2000-04-25",
      IPv4,
    );

    const set_password_token = await verification.confirmUserCreationVerificationCode(
      token,
      current_code,
      IPv4,
    );

    // Correctly await the Promise before extracting the payload object
    const verification_decoded_result = await JWTHelper.decode(
      token,
      process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY,
    );
    const verification_request_decoded = verification_decoded_result?.payload;

    const set_pass_decoded_result = await JWTHelper.decode(
      set_password_token,
      process.env.JWT_SET_PASS_STATE,
    );
    const decoded = set_pass_decoded_result?.payload;

    delete verification_request_decoded.iat;
    delete verification_request_decoded.exp;
    delete decoded.iat;
    delete decoded.exp;

    //

    expect(token).toBeTypeOf("string");
    expect(verification_request_decoded).toBeDefined();
    expect(verification_request_decoded).toMatchObject(decoded);
  });
});
