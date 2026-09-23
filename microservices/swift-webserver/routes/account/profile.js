import express from "express";
import { ViewProfilePicture } from "./profile/controller/view.profile.pic";
import {
  UploadProfilePictureValidator,
  UploadProfilePicture,
} from "./profile/controller/post.profile.pic";
import { ConfigProfile } from "./profile/controller/configure.profile";
import { GETConfigProfile } from "./profile/controller/get.profile.config";
import { ViewProfile } from "./profile/controller/view.profile";
const ProfileRouter = express.Router();
ProfileRouter.get("/:userId/picture", ViewProfilePicture);
ProfileRouter.post(
  "/picture-upload",
  UploadProfilePictureValidator,
  UploadProfilePicture,
);
ProfileRouter.put("/configure", ConfigProfile);
ProfileRouter.get("/configure", GETConfigProfile);
ProfileRouter.get("/view", ViewProfile);

export default ProfileRouter;
