import { AuthenticationGRPCClient as client } from "../../../../../grpc-clients/user/access.token.renew";

export const AccessTokenRenewalController = async (req, res) => {
  const refresh_token = req.cookies.refresh_token;

  if (!refresh_token) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required field: refresh_token." });
  }

  try {
    const response = await client.RenewAccessToken({ refresh_token });
    const {
      success,
      refresh_token: rotated_refresh_token,
      ...responseBody
    } = response;

    if (success) {
      const ttlString = process.env.JWT_AUTH_REFRESH_TOKEN_TTL || "30d";
      const days = parseInt(ttlString, 10);
      const REFRESH_TTL_MS = days * 24 * 60 * 60 * 1000;

      res.cookie("refresh_token", rotated_refresh_token, {
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
