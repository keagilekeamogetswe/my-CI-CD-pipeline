import { AccountAuthToken } from "../../user-flow/account.auth.tokens.js";
import { CredentialsRepository } from "../../credentials/repository.js";
import { DeviceInfo } from "../../../utility/device.infor.js";
import { Database } from "../../db.js";
import { Login } from "../../user-flow/account.log.in.js";

export async function logInHandler(call, callback) {
  let connection;

  try {
    const { user_id, password, device_info } = call.request;
    connection = await Database.getSQLConnection();
    const refreshToken = await Login(
      user_id,
      password,
      device_info,
      connection,
    );
    callback(null, {
      refresh_token: refreshToken,
      message: "Login was successful",
      success: true,
    });
  } catch (error) {
    const grpcError = new Error(error.message || "Unable to log in");
    grpcError.code =
      error.message === "Invalid credentials"
        ? grpc.status.UNAUTHENTICATED
        : error.message === "Password cannot be empty" ||
            error.message?.includes("device_info")
          ? grpc.status.INVALID_ARGUMENT
          : grpc.status.INTERNAL;
    callback(grpcError);
  } finally {
    connection?.release();
  }
}
