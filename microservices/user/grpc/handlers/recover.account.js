import { AccountAuthToken } from "../../user-flow/account.auth.tokens.js";
import { Database } from "../../db.js";
import { Login } from "../../user-flow/account.log.in.js";
import { LoginErrorRepository } from "../../config/login.errors.js";

export async function RecoverAccountHandler(call, callback) {
  let connection;
  let transactionStarted = false;

  try {
    connection = await Database.getSQLConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const { user_id, password, device_info } = call.request;

    const refreshToken = await Login(
      user_id,
      password,
      device_info,
      connection,
    );
    const accessToken =
      await AccountAuthToken.access.issueFromRefreshToken(refreshToken);
    await connection.commit();
    callback(null, {
      refresh_token: refreshToken,
      access_token: accessToken,
      message: "Login was successful",
      success: true,
    });
  } catch (error) {
    try {
      if (!transactionStarted) throw error;
      await connection.rollback(); // Rollback ONLY on error
    } catch (rollbackError) {
      if (transactionStarted) console.error("Rollback failed:", rollbackError);
    }
    let errorMessage = LoginErrorRepository.UNEXPECTED_ERROR;
    if (error?.message === LoginErrorRepository.DEVICE_INFOR_STR_ERROR)
      errorMessage = LoginErrorRepository.DEVICE_INFOR_STR_ERROR;
    else if (error?.message === LoginErrorRepository.EMPTY_PASSWORD)
      errorMessage = LoginErrorRepository.EMPTY_PASSWORD;
    else if (error?.message === LoginErrorRepository.INVALID_CREDENTIALS)
      errorMessage = LoginErrorRepository.INVALID_CREDENTIALS;
    callback(null, { message: errorMessage, success: false });
  } finally {
    connection?.release();
  }
}
