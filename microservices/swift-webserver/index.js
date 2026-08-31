import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import ApiRouter from "./routes/api.routes";
import { authMiddleware } from "./middleware/access.token";

// Standard cross-version ESM approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rateLimitBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_PATHS = new Set([
  "/api/start",
  "/api/start/verify",
  "/api/access-token",
  "/api/account/recovery",
]);

const rateLimitPruner = setInterval(() => {
  const now = Date.now();

  for (const [key, timestamps] of rateLimitBuckets.entries()) {
    const activeTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );

    if (activeTimestamps.length === 0) {
      rateLimitBuckets.delete(key);
      continue;
    }

    rateLimitBuckets.set(key, activeTimestamps);
  }
}, RATE_LIMIT_WINDOW_MS);

rateLimitPruner.unref?.();

function authRateLimiter(req, res, next) {
  if (!AUTH_RATE_LIMIT_PATHS.has(req.path)) {
    return next();
  }

  const maxRequests = req.path === "/api/access-token" ? 60 : 10;
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const bucket = (rateLimitBuckets.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (bucket.length === 0) {
    rateLimitBuckets.delete(key);
  }

  if (bucket.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many authentication requests. Please try again shortly.",
    });
  }

  bucket.push(now);
  rateLimitBuckets.set(key, bucket);
  return next();
}

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) =>
  authRateLimiter(req, res, () => authMiddleware(req, res, next)),
);

app.use("/api", ApiRouter);

app.all("/api/*splat", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
  }),
);

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  if (process.send) {
    process.send({ type: "READY" });
  }
});
