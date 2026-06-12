import argon2 from "argon2";
import * as jose from "jose";
import { JWTHelper } from "../../utility/jwt";
class User {
  hashed_password;
  constructor(username, user_id = null) {
    this.username = username;
    this.user_id = user_id;
  }
  async setHashedPassword(password) {
    console.log("Raw password: 2", password);
    this.hashed_password = await argon2.hash(password);
    console.log("Hashed password: ", await this.hashed_password);
    return true;
  }
  async verifyPassword(password) {
    console.log("Password: ", password);
    console.log("Hashed password: ", this.hashed_password);
    return await argon2.verify(this.hashed_password, password);
  }
}

export const userCredentials = () => {
  let user;
  return {
    setCredentials: async (username, user_id, password) => {
      user = new User(username, user_id);
      await user.setHashedPassword(password);
      return true;
    },

    verify: async (password) => {
      return await user.verifyPassword(password);
    },

    updatePassword: async (old_pass, new_pass) => {
      const ok = await user.verifyPassword(old_pass);
      if (ok) {
        await user.setHashedPassword(new_pass);
        return true;
      }
      return false;
    },
    requestVerification: async (contact) => {
      const otp = Math.random().toString().substring(2, 8); // Generate a random OTP
      const otp_hash = await argon2.hash(String(otp));
      const payload = { hashed_otp: otp_hash, contact };
      console.log("Generated Payload: ", payload);
      const verification_jwt = await JWTHelper.encode(
        payload,
        process.env.JWT_VERIFICATION_REQUEST_TTL,
        process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY,
      );
      return process.env.ENVIRONMENT === "testing"
        ? { jwt: verification_jwt, otp }
        : verification_jwt;
    },
    updateViaVerification: async (verification_jwt, verification_code) => {
      console.log("Verification JWT: ", verification_jwt);
      const { payload } = await JWTHelper.decode(
        verification_jwt,
        process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY,
      );
      console.log("Verification payload: ", payload);
      const { hashed_otp } = payload;

      console.log("Decoded hashed_otp: ", hashed_otp);
      const ok = await argon2.verify(hashed_otp, verification_code);
      if (ok) {
        return true;
      }
      return false;
    },

    updateUsername: async (new_username, password) => {
      const ok = await user.verifyPassword(password);
      if (!ok) return false;
      user.username = new_username;
      return true;
    },
  };
};
