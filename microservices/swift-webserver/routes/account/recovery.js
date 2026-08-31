import express from "express";
import { body, validationResult } from "express-validator";
import { UserRecoverAccountGRPCClient } from "../../../grpc-clients/user/recover.account.js";
import { buildRequestDeviceContext } from "../../../utility/device.context.js";

const RecoveryRouter = express.Router();

const RecoveryValidator = [
  body("user_id").trim().notEmpty().withMessage("user_id is required"),
  body("password").isString().notEmpty().withMessage("password is required"),
  body("device_info")
    .isString()
    .notEmpty()
    .withMessage("device_info is required"),
  body("fp_hash").optional().isString(),
];

RecoveryRouter.post("/", RecoveryValidator, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const requestDeviceContext = buildRequestDeviceContext(req, {
      device_info: req.body.device_info,
      fp_hash: req.body.fp_hash,
    });
    const response = await UserRecoverAccountGRPCClient.RecoverAccount({
      userId: req.body.user_id,
      password: req.body.password,
      deviceInfo: requestDeviceContext.device_info,
    });
    const { refresh_token, success, ...responseBody } = response;
    const clientResponse = { success, ...responseBody };

    if (!success) {
      return res.status(400).json(clientResponse);
    }

    const ttlString = process.env.JWT_AUTH_REFRESH_TOKEN_TTL || "30";
    const days = parseInt(ttlString, 10);
    const REFRESH_TTL_MS = days * 24 * 60 * 60 * 1000;

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.ENV !== "test",
      sameSite: "Strict",
      expires: new Date(Date.now() + REFRESH_TTL_MS),
    });

    return res.status(200).json(clientResponse);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default RecoveryRouter;