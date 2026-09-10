import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import sharp from "sharp";
import { UserProfileModifierGRPCClient } from "../../../../../grpc-clients/user/profile.modifier.js";
import { Database } from "../../../../../user/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory =
  process.env.PROFILE_PICTURE_UPLOAD_DIR ||
  path.resolve(__dirname, "../../../../uploads/profile-pictures");
mkdirSync(uploadDirectory, { recursive: true });

const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (file.mimetype !== "image/jpeg") {
      return callback(new Error("Profile picture must be a JPEG image."));
    }
    callback(null, true);
  },
});

export function UploadProfilePicture(req, res, next) {
  profilePictureUpload.single("profile_picture")(req, res, (error) => {
    if (!error) {
      return next();
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Profile picture must be smaller than 5MB."
        : error.message;
    return res.status(400).json({ error: message });
  });
}

export async function SetUpProfile(req, res) {
  const user_id = req.user?.user_id;
  const hasBio = Object.hasOwn(req.body, "bio");
  const bio =
    hasBio && typeof req.body.bio === "string" ? req.body.bio.trim() : "";

  const unsupportedFields = Object.keys(req.body).filter(
    (field) => !["bio"].includes(field),
  );

  if (!user_id) {
    return res.status(401).json({ error: "Authenticated user ID is missing." });
  }
  if (unsupportedFields.length > 0) {
    return res.status(400).json({
      error: `Unsupported profile fields: ${unsupportedFields.join(", ")}.`,
    });
  }
  if (hasBio && typeof req.body.bio !== "string") {
    return res.status(400).json({ error: "Bio must be text." });
  }
  if (bio.length > 300) {
    return res
      .status(400)
      .json({ error: "Bio must contain no more than 300 characters." });
  }
  if (!req.file && !hasBio) {
    return res.status(400).json({
      error: "Provide a profile picture, a bio, or both.",
    });
  }

  let connection;
  let previousFilename;
  let storedFilename;
  let storedPath;

  try {
    const primaryConfig = {};

    if (req.file) {
      const uploadedAt = new Date().toISOString().replace(/[:.]/g, "-");
      storedFilename = `${uploadedAt}-${randomUUID()}.jpg`;
      storedPath = path.join(uploadDirectory, storedFilename);

      try {
        const metadata = await sharp(req.file.buffer, {
          limitInputPixels: 40_000_000,
        }).metadata();
        if (
          metadata.format !== "jpeg" ||
          !metadata.width ||
          !metadata.height
        ) {
          return res.status(400).json({
            error: "Profile picture must be a valid JPEG image.",
          });
        }
        if (metadata.width !== metadata.height) {
          return res.status(400).json({
            error: "Profile picture must be square.",
          });
        }

        await sharp(req.file.buffer, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 85, mozjpeg: true })
          .toFile(storedPath);
      } catch {
        return res.status(400).json({
          error: "Profile picture must be a valid JPEG image.",
        });
      }

      connection = await Database.getSQLConnection();
      const [[profile]] = await connection.execute(
        "SELECT profile_picture FROM user_profiles WHERE user_id = ?",
        [user_id],
      );
      previousFilename = profile?.profile_picture;
      primaryConfig.profile_picture = storedFilename;
    }

    if (hasBio) {
      primaryConfig.bio = bio;
    }

    const response = await UserProfileModifierGRPCClient.ModifyProfile({
      user_id: user_id,
      primaryConfig,
    });

    if (!response.success) {
      await removeStoredFile(storedPath);
      return res
        .status(400)
        .json({ message: response.message, success: response.success });
    }

    if (storedFilename && previousFilename !== storedFilename) {
      await removeStoredProfilePicture(previousFilename);
    }

    return res.status(200).json({
      success: true,
      message: response.message,
      profile_picture_url: storedFilename
        ? `/api/profile/${user_id}/picture`
        : undefined,
    });
  } catch (error) {
    await removeStoredFile(storedPath);
    console.error("Profile setup failed:", error);
    return res
      .status(500)
      .json({ error: "Failed to update profile.", literaly: String(error) });
  } finally {
    connection?.release();
  }
}

async function removeStoredFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to remove profile picture upload:", error);
    }
  }
}

async function removeStoredProfilePicture(filename) {
  if (!filename || path.basename(filename) !== filename) {
    return;
  }

  try {
    await unlink(path.join(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to remove previous profile picture:", error);
    }
  }
}
