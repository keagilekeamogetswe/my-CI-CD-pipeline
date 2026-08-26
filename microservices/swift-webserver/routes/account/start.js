import express from "express";
import { ProfileDataValidator } from "./start/validator/profile.data";
import { VerificationConfirmationValidator } from "./start/validator/verification.confirm";
import { confirmProfileCreationVerification } from "./start/controller/confirm.verification";
import { requestProfileCreationVerification } from "./start/controller/request.verification";
const StartRouter = express.Router();

StartRouter.post(
  "/verify",
  VerificationConfirmationValidator,
  confirmProfileCreationVerification,
);
StartRouter.post("/", ProfileDataValidator, requestProfileCreationVerification);

export default StartRouter;
