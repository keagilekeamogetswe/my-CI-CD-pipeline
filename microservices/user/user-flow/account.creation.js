import { CredentialsRepository } from "../credentials/repository";
import { ProfileRepository } from "../profile/repository";

import Verification from "../verification/control";
import { Database } from "../db";
import { AccountAuthToken } from "./account.auth.tokens.js";

export const AccountCreation = (() => {
  return {
    /*
     * Starts the account creation process.
     *
     * The supplied account and device information is placed inside
     * a verification payload. Verification.request() is responsible
     * for generating and sending the phone verification code.
     */
    async request(name, lastname, dob, phone, auto_detected) {
      const { code, body, dial_code_id } = phone;

      const payload = {
        name,
        lastname,
        dob,
        phone,
        ...auto_detected,
      };

      const verification_token = await Verification.request(payload, "phone");

      return verification_token;
    },

    /*
     * Completes account creation after the phone verification succeeds.
     *
     * The flow is:
     *
     * 1. Verify the submitted verification code.
     * 2. Create the user's authentication record.
     * 3. Associate the verified phone number with the user.
     * 4. Create the user's profile.
     * 5. Create a refresh-token session.
     * 6. Persist the hashed refresh token in the database.
     * 7. Return the raw refresh token to the caller.
     */
    async confirm(verification_token, otp_code, mysql_connection) {
      // Reuse the supplied connection when called inside an existing
      // transaction; otherwise create a new database connection.
      mysql_connection =
        mysql_connection ?? (await Database.getSQLConnection());

      // Validate the verification token and retrieve the original
      // account/device payload that was stored during request().
      const payload = await Verification.confirm(verification_token, otp_code);

      /*
       * The verification payload contains the dial-code information
       * required during verification. The actual dial code itself
       * does not need to be persisted with the phone record because
       * dial_code_id provides the database relationship.
       */
      delete payload.phone.code;

      // Create the base authentication/credentials record first so
      // that the generated user_id can be used by related records.
      const user_id = await CredentialsRepository.create(
        null,
        mysql_connection,
      );

      /*
       * Store the verified phone number and associate it with the
       * newly-created user.
       */
      const phone_id = await CredentialsRepository.linkPhone(
        user_id,
        payload.phone,
        mysql_connection,
      );

      // Add the generated database identifiers to the profile payload.
      payload.phone_id = phone_id;
      payload.user_id = user_id;

      // Create the user's profile using the verified account data.
      const profile_id = await ProfileRepository.create(
        payload,
        mysql_connection,
      );

      const refresh_token = await AccountAuthToken.refresh.create(
        {
          user_id,
          device_info: payload.device_info,
          device_name: payload.device_name,
          user_agent: payload.user_agent,
          webgl_fingerprint: payload.webgl_fingerprint,
          device_id_hash: payload.device_id_hash,
          ip_address: payload.ip_address,
          finger_print: payload.fp_hash,
          fp_hash: payload.fp_hash,
        },
        mysql_connection,
      );
      const access_token =
        await AccountAuthToken.access.issueFromRefreshToken(refresh_token);

      return {
        refresh_token,
        access_token,
      };
    },
  };
})();
