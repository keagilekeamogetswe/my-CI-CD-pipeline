import { AccountAuthToken } from "./account.auth.tokens.js";
import { CredentialsRepository } from "../credentials/repository.js";
import { DeviceInfo } from "../../utility/device.infor.js";

export async function Login(user_id, password, device_info, mysql_connection) {
  if (typeof device_info !== "string") {
    throw new Error(`string is expected for device_info but got ${typeof device_info}.`);
  }
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password cannot be empty");
  }
  // Verify password
  const pass_correct = await CredentialsRepository.verifyPassword(
    user_id,
    password,
    mysql_connection,
  );
  if (!pass_correct) {
    throw new Error("Invalid credentials");
  }

  // Build device info object
  const device_info_instance = DeviceInfo.fromString(device_info);

  const payload = {
    user_id,
    ...device_info_instance.toSessionPayload(),
  };

  // Create a session (refresh token)
  const refresh_token = await AccountAuthToken.refresh.create(payload, mysql_connection);
  return refresh_token;
}
