import { validationResult } from "express-validator";
import { UserCreateAccountConfirmGRPCClient as client } from "../../../../../grpc-clients/user/account.creation.confirm.js";

export const confirmProfileCreationVerification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { verification_token, code } = req.body;

  try {
    // If client.CreateAccountConfirm returns a Promise directly:
    const response = await client.CreateAccountConfirm({
      verification_token,
      code,
    });

    const { success, refresh_token, ...responseBody } = response;

    if (success) {
      const ttlString = process.env.JWT_AUTH_REFRESH_TOKEN_TTL || "30";
      const days = parseInt(ttlString, 10);
      const REFRESH_TTL_MS = days * 24 * 60 * 60 * 1000;
      res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: process.env.ENV !== "test",
        sameSite: "Strict",
        expires: new Date(Date.now() + REFRESH_TTL_MS),
      });

      return res.status(200).json(responseBody);
    }

    return res.status(400).json(responseBody);
  } catch (error) {
    console.error("gRPC Error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};
