import express from "express";
import { ViewProfilePicture } from "./profile/controller/view.profile.pic";
const ProfileRouter = express.Router();
ProfileRouter.get("/:userId/picture", ViewProfilePicture);

export default ProfileRouter;
