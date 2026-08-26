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

    const { success, refresh_token, message } = response;

    if (success) {
      return res.status(200).json({ refresh_token, message });
    }

    return res.status(400).json({ error: message || "Verification failed" });
  } catch (error) {
    console.error("gRPC Error:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
};
