import express from "express";
import { ProfileDataValidator } from "./start/validator/profile.data";
import { VerificationConfirmationValidator } from "./start/validator/verification.confirm";
import { confirmProfileCreationVerification } from "./start/controller/confirm.verification";
import { requestProfileCreationVerification } from "./start/controller/request.verification";
import {
  SetUpProfile,
  UploadProfilePicture,
} from "./start/controller/setup.profile";
const StartRouter = express.Router();

StartRouter.post(
  "/verify",
  VerificationConfirmationValidator,
  confirmProfileCreationVerification,
);
StartRouter.post("/", ProfileDataValidator, requestProfileCreationVerification);
StartRouter.post("/profile", UploadProfilePicture, SetUpProfile);

export default StartRouter;
