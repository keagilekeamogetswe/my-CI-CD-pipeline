import express from "express";
import { ViewProfilePicture } from "./profile/controller/view.profile.pic";
import {
  UploadProfilePictureValidator,
  UploadProfilePicture,
} from "./profile/controller/post.profile.pic";
const ProfileRouter = express.Router();
ProfileRouter.get("/:userId/picture", ViewProfilePicture);
ProfileRouter.post(
  "/picture-upload",
  UploadProfilePictureValidator,
  UploadProfilePicture,
);

export default ProfileRouter;
