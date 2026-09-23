import { ProfileRepository } from "../../profile/repository.js";
import { Database } from "../../db.js";

export async function UserProfileviewingHandler(call, callback) {
  let connection;
  let transactionStarted = false;
  try {
    const { user_id } = call.request;
    if (!user_id) {
      return callback(null, {
        message: "A user ID is required",
        success: false,
      });
    }
    let retrieved_data;
    connection = await Database.getSQLConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    retrieved_data = await ProfileRepository.getProfile(user_id, connection);
    await connection.commit();
    transactionStarted = false;
    callback(null, {
      message: retrieved_data
        ? "Profile was retrieved successfully"
        : "Profile data could not be retrieved",
      data: retrieved_data
        ? {
            id: String(retrieved_data.id ?? ""),
            name: retrieved_data.name ?? "",
            lastname: retrieved_data.lastname ?? "",
            dob: retrieved_data.dob
              ? new Date(retrieved_data.dob).toISOString().slice(0, 10)
              : "",
            bio: retrieved_data.bio ?? "",
            phone: retrieved_data.phone ?? "",
            profile_picture: retrieved_data.profile_picture ?? "",
          }
        : undefined,
      success: !!retrieved_data,
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
