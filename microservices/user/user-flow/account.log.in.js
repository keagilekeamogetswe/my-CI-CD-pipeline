import { AccountAuthToken } from "./account.auth.tokens.js";
import { CredentialsRepository } from "../credentials/repository.js";
import { LoginErrorRepository } from "../config/login.errors.js";
import { normalizeDeviceContext } from "../../utility/device.context.js";

export async function Login(user_id, password, device_info, mysql_connection) {
  if (typeof device_info !== "string") {
    console.log(`string is expected for device_info but got ${typeof device_info}.`)
    throw new Error(LoginErrorRepository.DEVICE_INFOR_STR_ERROR);
  }
  if (typeof password !== "string" || password.length === 0) {
    throw new Error(LoginErrorRepository.EMPTY_PASSWORD);
  }
  // Verify password
  const pass_correct = await CredentialsRepository.verifyPassword(
    user_id,
    password,
    mysql_connection,
  );
  if (!pass_correct) {
    throw new Error(LoginErrorRepository.INVALID_CREDENTIALS);
  }

  const payload = {
    user_id,
    ...normalizeDeviceContext(device_info),
  };

  // Create a session (refresh token)
  const refresh_token = await AccountAuthToken.refresh.create(payload, mysql_connection);
  return refresh_token;
}
