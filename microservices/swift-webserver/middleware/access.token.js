import { JWTHelper } from "../../utility/jwt";
import {
  assertMatchingDeviceContext,
  buildRequestDeviceContext,
} from "../../utility/device.context.js";

const WHITELISTED_ROUTES = [
  "/api/start",
  "/api/start/verify",
  "/api/access-token",
  "/api/account/recovery",
];
if (process.env.ENV == "test") WHITELISTED_ROUTES.push("/api/white-listed");
const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_TOKEN_SECRET ||
  process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY ||
  process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY;

export async function authMiddleware(req, res, next) {
  if (WHITELISTED_ROUTES.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token not supplied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await JWTHelper.decode(token, ACCESS_TOKEN_SECRET);
    const requestDeviceContext = buildRequestDeviceContext(req, payload);
    assertMatchingDeviceContext(requestDeviceContext, payload);
    req.user = payload;
    return next();
  } catch (err) {
    return res
      .status(401)
      .json({
        error: "Re-authentication required",
        message: err.message || "Invalid or expired access token",
      });
  }
}
