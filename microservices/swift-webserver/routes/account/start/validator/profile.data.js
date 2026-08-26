import { body } from "express-validator";

export const ProfileDataValidator = [
  // Target nested properties using dot notation
  body("phone.code")
    .matches(/^\+\d{1,5}$/)
    .withMessage("Phone code must start with + followed by 1 to 5 digits"),
  body("phone.body")
    .matches(/^\d+$/)
    .withMessage("Phone body must contain digits only"),
  body("phone.dial_code_id")
    .matches(/^\d+$/)
    .withMessage("Dial code ID must be numeric"),

  // Validate multiple array fields simultaneously
  body(["lastname", "name"])
    .trim()
    .matches(/^[A-Za-z]+ ?[A-Za-z]*$/)
    .withMessage("Name must contain only letters and an optional space"),

  // Chrome default <input type="date"> sends ISO 8601 strings (YYYY-MM-DD)
  body("dob")
    .trim()
    .isISO8601()
    .withMessage("Date of birth must be a valid YYYY-MM-DD date"),
];
