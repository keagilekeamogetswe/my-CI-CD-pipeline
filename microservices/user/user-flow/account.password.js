import argon2 from "argon2"
import { ResetPasswordVerificationRequest } from "./password-reset/verification.request"
import { PASS_RESET_METHOD } from "./password-reset/constant"
import { resetWithCurrentPassword } from "./password-reset/verification.with.cpass"
import { ResetPasswordVerificationConfirmation } from "./password-reset/verification.confirm"
import { setNewPasswordToken } from "./password-reset/set.password.token"

export const AccountPasswordReset = (() => {
  /*
  * Handles password-reset requests where the user has
  * access to a verified contact method.
  */
  return {
    async requestEmail(user_id, mysql_connection){
      const request_object = new ResetPasswordVerificationRequest(PASS_RESET_METHOD.EMAIL, mysql_connection)
      const token_id = await request_object.run(user_id)
      return token_id;
    },
    async requestSMS(user_id, mysql_connection){
      const request_object = new ResetPasswordVerificationRequest(PASS_RESET_METHOD.PHONE, mysql_connection)
      const token_id = await request_object.run(user_id);
      return token_id;
    },
    async requestUsingCurrentPassword(user_id, current_password, new_password, mysql_connection){
      return await resetWithCurrentPassword(user_id, current_password, new_password, mysql_connection)
    },
    async confirm(user_id, token, otp,  mysql_connection){
      const confirmation_object = new ResetPasswordVerificationConfirmation(mysql_connection)
      return await confirmation_object.run(user_id, token, otp)
    },
    async resetPassword(user_id, token_id, token, new_password, mysql_connection){
      return await setNewPasswordToken.redeemOpaque(user_id, token_id, token,new_password, mysql_connection)
    }
  }
})()