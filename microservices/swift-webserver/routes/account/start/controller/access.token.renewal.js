import { validationResult } from "express-validator";
import { AuthenticationGRPCClient as client } from "../../../../../grpc-clients/user/access.token.renew";
import cookieParser from "cookie-parser";

export const AccessTokenRenewalController = async (req, res) => {
  const refresh_token = req.cookies.refresh_token;

  try {
    const response = await client.RenewAccessToken({ refresh_token });
    const {
      success,
      refresh_token: rotated_refresh_token,
      access_token,
      message,
    } = response;

    if (success) {
      const ttlString = process.env.JWT_AUTH_REFRESH_TOKEN_TTL || "30d";
      const days = parseInt(ttlString, 10);
      const REFRESH_TTL_MS = days * 24 * 60 * 60 * 1000;

      res.cookie("refresh_token", rotated_refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "test", // secure only in prod
        sameSite: "Strict",
        expires: new Date(Date.now() + REFRESH_TTL_MS),
      });

      return res.status(200).json({
        message: "Access token renewed successfully",
        access_token,
      });
    }

    return res.status(400).json({ error: message || "Verification failed" });
  } catch (error) {
    console.error("gRPC Error:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", message: error.message });
  }
};
