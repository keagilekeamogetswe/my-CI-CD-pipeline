import { validationResult } from "express-validator";
import { UserCreateAccountRequestGRPCClient } from "../../../../../grpc-clients/user/account.creation.request";
import { buildRequestDeviceContext } from "../../../../../utility/device.context.js";

export const requestProfileCreationVerification = async (req, res) => {
  // Check Express Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[DEBUG 4] Validation failed:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, lastname, dob, phone, fp_hash, device_info } = req.body;
  const requestDeviceContext = buildRequestDeviceContext(req, {
    device_info,
    fp_hash,
  });

  try {
    const response =
      await UserCreateAccountRequestGRPCClient.CreateAccountRequest({
        name,
        lastname,
        dob,
        phone,
        device_info: requestDeviceContext.device_info,
        ip_address: requestDeviceContext.ip_address,
        fp_hash: requestDeviceContext.webgl_fingerprint || fp_hash,
      });
    return res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    console.error("[DEBUG ERROR] Controller Exception:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};
