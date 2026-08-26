import { body } from "express-validator";

export const VerificationConfirmationValidator = [
  // AFTER (Allows JWT / JWE string format)
  body("verification_token")
    .isString()
    .notEmpty()
    .withMessage("Verification token must be a valid string"),
  body("code").trim().isNumeric().withMessage("Code must contain digits only"),
];
