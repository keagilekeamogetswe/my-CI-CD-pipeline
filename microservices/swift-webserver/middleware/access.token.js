// middleware/access.token.js
import fs from "fs";
import { JWTHelper } from "../../utility/jwt";

const WHITELISTED_ROUTES = [
  "/api/start",
  "/api/start/verify",
  "/api/white-listed",
];
const PUBLIC_KEY = process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY;

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
    const { payload } = await JWTHelper.verify(token, PUBLIC_KEY);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
}
