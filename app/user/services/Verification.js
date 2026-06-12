import argon2 from "argon2";
import * as jose from "jose";
import { JWTHelper } from "./../../utility/jwt";

export default class Verification {
  SMS;
  Email;
  constructor(SMSService, EmailService) {
    this.SMS = SMSService;
    this.Email = EmailService;
  }
  async requestUserCreationVerificationCode(
    name,
    lastname,
    phone,
    date_of_birth,
    IPv4,
  ) {
    const { dial_code_id, phone_body, phone_full } = phone;
    const { success, otp } = await this.SMS.send(phone_full);
    const otp_hash = await argon2.hash(otp);
    const IPv4_hash = await argon2.hash(IPv4);

    if (!success) throw new Error("SMS could not be sent.");
    const payload = {
      name,
      lastname,
      phone,
      dob: date_of_birth,
      IPv4_hash,
      otp_hash,
    };
    const verification_jwt = await JWTHelper.encode(
      payload,
      process.env.JWT_VERIFICATION_REQUEST_TTL,
      process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY,
    );
    return verification_jwt ?? null;
  }
  async confirmUserCreationVerificationCode(JWT_token, otp_code, IPv4) {
    //Redis client to check jti from ipv4 attempts

    // If it the number of attempts exceed env.VERIFICATION_MAX_ATTEMPS black list the token by including its hash on the ipv4 key ref in redis blacklist table
    const { payload } = await JWTHelper.decode(
      JWT_token,
      process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY,
    );
    const status =
      (await argon2.verify(payload.otp_hash, otp_code)) &&
      (await argon2.verify(payload.IPv4_hash, IPv4));
    // long lived JWT cookie for setting password and finalising user creation.
    const on_payload_build_exclude = ["otp_hash", "IPv4_hash"];
    let new_payload = {};
    Object.keys(payload).forEach((key) => {
      if (!on_payload_build_exclude.includes(key))
        new_payload[key] = payload[key];
    });
    //Sign JWT with a different key
    return (
      (await JWTHelper.encode(
        new_payload,
        process.env.JWT_SET_PASS_STATE_TTL,
        process.env.JWT_SET_PASS_STATE,
      )) ?? null
    );
  }
}
