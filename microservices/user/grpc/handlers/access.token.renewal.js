import { Database } from "../../db.js";
import { AccountAuthToken } from "../../user-flow/account.auth.tokens.js";

export async function RenewAccessTokenHandler(call, callback) {
  let connection;
  let transactionStarted = false;

  try {
    connection = await Database.getSQLConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const { refresh_token } = call.request; // align with proto
    const { access_token, refresh_token: rotated_refresh_token } =
      await AccountAuthToken.access.renew(refresh_token, connection);

    await connection.commit();
    callback(null, {
      refresh_token: rotated_refresh_token,
      access_token,
      success: true,
      message: "New access token issued",
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }
    callback(null, {
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
}
