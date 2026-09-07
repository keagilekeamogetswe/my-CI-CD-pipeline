import { ProfileRepository } from "../../profile/repository.js";
import { Database } from "../../db.js";

export async function UserProfileModifierHandler(call, callback) {
  let connection;
  let transactionStarted = false;

  try {
    const { primary_config, config, user_id } = call.request;
    const mode = primary_config ? "primary" : config ? "secondary" : null;
    if (!mode) {
      return callback(null, {
        message: "no valid configuration provided",
        success: false,
      });
    }

    let rows_affected;
    if (mode === "primary") {
      connection = await Database.getSQLConnection();
      await connection.beginTransaction();
      transactionStarted = true;
      rows_affected = await ProfileRepository.change(
        user_id,
        primary_config.values,
        connection,
      );
      await connection.commit();
      transactionStarted = false;
    } else {
      const profileCollection =
        await Database.getMongoConnection("user_profiles");
      rows_affected = await ProfileRepository.patchConfig(
        user_id,
        config.values,
        profileCollection,
      );
    }

    callback(null, {
      message: rows_affected
        ? "Profile was successfully updated"
        : "No changes were made",
      success: rows_affected,
    });
  } catch (error) {
    try {
      if (transactionStarted) {
        await connection.rollback();
      }
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError);
    }
    console.log(error);
    callback(null, {
      message: "Some unexpected error occured!",
      success: false,
    });
  } finally {
    connection?.release();
  }
}
