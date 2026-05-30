import argon2 from 'argon2';
import * as jose from 'jose';

class User {
  #hashed_password;
  constructor(username, user_id = null) {
    this.username = username;
    this.user_id = user_id;
  }
  setHashedPassword(hashed_password) {
    this.#hashed_password = hashed_password;
    return true;
  }
}

export const userCredentials = () => {
  let user = new User();
  return {
    setCredentials: (username, user_id) => {
      user = new User(username, user_id);
      return this
    },
    verify: (password) => {
      // Verification logic here
      if (password == user.#hashed_password) {
        return true;
      }
      return false;
    },
    UpdatePassword: (old_pass, new_pass) => {
      const verificationResult = await argon.verify(user.#hashed_password, old_pass);
      if (verificationResult.success) {
        user.setHashedPassword(argon.hash(new_pass));
        return true;
      }
      return false;
    },
    UpdateViaVerification: (verification_jwt, verification_code) => {
      // Implement verification code logic here
      const payload = JWTHelper.decode(verification_jwt, process.env.JWT_OTP_SECRET);
      const { hashed_otp, user_id } = payload;
      const verificationResult = await argon.verify(hashed_otp, verification_code)

      if (verificationResult) {
        return user.setPassword(new_pass);
      }
      if (verificationResult) { // Placeholder for valid code check
        return user.setPassword(new_pass);
      }
      return false;
    },
    updateUsername: (new_username, password) => {

      if (user.#password !== password) {
        return false;
      }
      user.username = new_username;
      return true;
    }
  }
};