import express from "express";
import StartRouter from "./account/start";
import { AccessTokenRenewalController } from "./account/start/controller/access.token.renewal";
import RecoveryRouter from "./account/recovery";
import { JWTHelper } from "../../utility/jwt.js";
// API ROUTES (Mount everything under /api)
const ApiRouter = express.Router();
if (process.env.ENV == "test") {
  ApiRouter.get("/protected", async (req, res) => {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing access token" });
    }

    const accessKey =
      process.env.JWT_ACCESS_TOKEN_SECRET ||
      process.env.JWT_ACCESS_TOKEN_PUBLIC_KEY ||
      process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY;

    let payload;
    try {
      ({ payload } = await JWTHelper.decode(token, accessKey));
    } catch {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    const tokenDeviceName = payload.device_info || "";
    const requestDeviceName = req.headers["x-device-name"] || "";

    if (tokenDeviceName && tokenDeviceName !== requestDeviceName) {
      return res.status(401).json({ error: "Re-authentication required" });
    }

    return res.json({ message: "made it to the protected route." });
  });
}

ApiRouter.get("/white-listed", (req, res) => {
  res.json({ message: "made it to the whitelisted route." });
});
ApiRouter.use("/start", StartRouter);
ApiRouter.use("/account/recovery", RecoveryRouter);
ApiRouter.get("/access-token", AccessTokenRenewalController);
export default ApiRouter;
