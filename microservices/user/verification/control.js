import * as crypto from "node:crypto";
import argon2 from "argon2";

import { VerificationRequestHTMLEMailTemplate } from "./html.email";
import { JWTHelper } from "../../../microservices/utility/jwt";
import { Notification } from "../../utility/notifications";

// Verification service wrapped in an IIFE so helper functions stay private.
const Verification = (() => {
  // Creates a signed JWT token that expires in 2 minutes.
  // Think of this as locking the verification information in a secure envelope.
  async function lock(payload) {
    const ttl = "2m";
    const key = process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY;

    return await JWTHelper.encode(payload, ttl, key);
  }

  // Opens the JWT token and returns the data that was stored inside it.
  async function unlock(token) {
    const key = process.env.JWT_VERIFICATION_REQUEST_SECRET_KEY;

    const { payload } = await JWTHelper.decode(token, key);

    return payload;
  }

  // Generates a random 6-digit verification code.
  // The range starts at 100000, so the code can never start with 0.
  function generateRandCode() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  return {
    // Sends a verification code to the user (email or SMS)
    // and returns a secure token that can later be used to verify the code.
    async request(payload, channel = "phone") {
      const allowedChannels = ["email", "phone"];

      // Only email and phone are allowed delivery methods.
      if (!allowedChannels.includes(channel)) {
        throw new Error("Channel not allowed.");
      }

      // Create a new random verification code.
      const code = generateRandCode();

      const appName = "App";

      // Plain text version of the message.
      const plainMessage =
        `Your ${appName} verification code is: ${code}. ` +
        `This code expires in 2 minutes. Do not share it with anyone.`;

      let messageSent = false;

      // Send the code by email.
      if (channel === "email") {
        if (!payload.email) {
          throw new Error("Email address is required.");
        }

        const html = VerificationRequestHTMLEMailTemplate(code);
        // Uses no reply default email when from is not supplied
        messageSent = await Notification.Email.send(
          html,
          plainMessage,
          payload.email,
        );

        // Send the code by SMS.
      } else {
        if (!payload.phone) {
          throw new Error("Phone number is required.");
        }

        const phone = payload.phone.code + payload.phone.body;

        messageSent = await Notification.SMS.send(plainMessage, phone);
      }

      // Stop if the notification could not be delivered.
      if (!messageSent) {
        throw new Error("Failed to send verification code.");
      }

      // Store only a HASH of the code, not the actual code itself.
      // This means even if someone gets the token, they cannot see the OTP.
      const verificationPayload = {
        ...payload, // Remember whether email or phone was used.
        otp_hash: await argon2.hash(code),
      };

      // Return a signed token containing the verification data.
      return await lock(verificationPayload);
    },

    // Checks whether the code entered by the user is correct.
    async confirm(token, otp_code) {
      // Read the data stored in the token.
      const payload = await unlock(token);

      // Compare the submitted code with the stored hash.
      const valid = await argon2.verify(payload.otp_hash, otp_code);
      delete payload.otp_hash;
      console.log(payload);
      // Reject if the code does not match.
      if (!valid) {
        throw new Error("Invalid verification code.");
      }

      // Remove the hash before returning the user data.
      delete payload.opt_hash;

      // Return the verified payload.
      return payload;
    },
  };
})();

export default Verification;
