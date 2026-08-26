import { validationResult } from "express-validator";
import { UserCreateAccountRequestGRPCClient } from "../../../../../grpc-clients/user/account.creation.request";

export const requestProfileCreationVerification = async (req, res) => {
  // Check Express Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[DEBUG 4] Validation failed:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, lastname, dob, phone, fp_hash, device_info } = req.body;

  try {
    const response =
      await UserCreateAccountRequestGRPCClient.CreateAccountRequest({
        name,
        lastname,
        dob,
        phone,
        device_info,
        ip_address: req.ip,
        fp_hash,
      });

    const { success, verification_token, message } = response;

    if (success) {
      console.log("[DEBUG 6] Sending HTTP 200 response to client");
      return res.status(200).json({ verification_token, message });
    }

    return res.status(400).json({ error: message || "Request failed" });
  } catch (error) {
    console.error("[DEBUG ERROR] Controller Exception:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
};
