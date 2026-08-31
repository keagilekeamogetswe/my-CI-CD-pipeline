import { AccountCreation } from "../../user-flow/account.creation.js";
import { Database } from "../../db.js";

export async function CreateAccountConfirmHandler(call, callback) {
  let connection;
  let transactionStarted = false;

  try {
    connection = await Database.getSQLConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const { verification_token, code } = call.request;
    const { refresh_token, access_token } = await AccountCreation.confirm(
      verification_token,
      code,
      connection,
    );

    await connection.commit();
    callback(null, {
      refresh_token,
      access_token,
      success: true,
      message: "Account created successfully",
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
