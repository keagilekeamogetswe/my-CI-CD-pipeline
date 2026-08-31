import { JWTHelper } from "../../utility/jwt";
import {
  assertMatchingDeviceContext,
  buildRequestDeviceContext,
} from "../../utility/device.context.js";

const AUTH_WINDOW_MS = 60_000;
const AUTH_MAX_REQUESTS = 120;
const authAttemptBuckets = new Map();

const WHITELISTED_ROUTES = [
  "/api/start",
  "/api/start/verify",
  "/api/access-token",
  "/api/account/recovery",
];
if (process.env.ENV == "test") WHITELISTED_ROUTES.push("/api/white-listed");
const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_TOKEN_SECRET ||
  process.env.JWT_ACCESS_TOKEN_PUBLIC_KEY ||
  // Preserve the legacy typo during env migration so older test/deploy setups still work.
  process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY;

function enforceProtectedRouteRateLimit(req, res) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const bucket = (authAttemptBuckets.get(key) || []).filter(
    (timestamp) => now - timestamp < AUTH_WINDOW_MS,
  );

  if (bucket.length >= AUTH_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: "Too many authenticated requests. Please try again shortly.",
    });
  }

  bucket.push(now);
  authAttemptBuckets.set(key, bucket);
  return null;
}

export async function authMiddleware(req, res, next) {
  if (WHITELISTED_ROUTES.includes(req.path)) {
    return next();
  }

  const rateLimitResponse = enforceProtectedRouteRateLimit(req, res);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token not supplied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await JWTHelper.verifyEncrypted(
      token,
      ACCESS_TOKEN_SECRET,
    );
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
