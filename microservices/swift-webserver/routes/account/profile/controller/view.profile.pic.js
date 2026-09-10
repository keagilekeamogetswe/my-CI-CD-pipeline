import path from "node:path";
import { fileURLToPath } from "node:url";
import { Database } from "../../../../../user/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory =
  process.env.PROFILE_PICTURE_UPLOAD_DIR ||
  path.resolve(__dirname, "../../../../uploads/profile-pictures");
const defaultProfilePicture = path.resolve(
  __dirname,
  "../../../../public/default-account-icon.svg",
);

export async function ViewProfilePicture(req, res) {
  const userId = req.params.userId;
  let connection;

  try {
    connection = await Database.getSQLConnection();
    const [[profile]] = await connection.execute(
      "SELECT profile_picture FROM user_profiles WHERE user_id = ?",
      [userId],
    );
    const filename = profile?.profile_picture;

    if (!filename) {
      return res.sendFile(defaultProfilePicture);
    }
    if (path.basename(filename) !== filename) {
      console.error("Invalid profile picture filename stored for user:", userId);
      return res.status(500).json({ error: "Profile picture is unavailable." });
    }

    return res.sendFile(path.join(uploadDirectory, filename), (error) => {
      if (!error) {
        return;
      }
      if (!res.headersSent) {
        res.status(error.statusCode === 404 ? 404 : 500).json({
          error: "Profile picture is unavailable.",
        });
      }
    });
  } catch (error) {
    console.error("Failed to retrieve profile picture:", error);
    return res.status(500).json({ error: "Failed to retrieve profile picture." });
  } finally {
    connection?.release();
  }
}
