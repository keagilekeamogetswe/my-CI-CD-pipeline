import { AccountCreation } from "../../user-flow/account.creation.js";

export async function CreateAccountRequestHandler(call, callback) {
  try {
    const { name, lastname, dob, phone, device_info, ip_address, fp_hash } =
      call.request;

    const verificationToken = await AccountCreation.request(
      name,
      lastname,
      dob,
      phone,
      { device_info, ip_address, fp_hash },
    );

    callback(null, {
      verification_token: verificationToken,
      success: true,
      message: "Account verification requested",
    });
  } catch (error) {
    callback(null, {
      success: false,
      message: error.message,
    });
  }
}
