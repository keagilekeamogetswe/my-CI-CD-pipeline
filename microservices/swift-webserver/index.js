import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import ApiRouter from "./routes/api.routes";
import { authMiddleware } from "./middleware/access.token";

// Standard cross-version ESM approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticPublicDirectory = process.env.STATIC_PUBLIC_DIR
  ? path.resolve(process.cwd(), process.env.STATIC_PUBLIC_DIR)
  : path.join(__dirname, "public");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api", authMiddleware, ApiRouter);

app.all("/api/*splat", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.use(
  express.static(staticPublicDirectory, {
    extensions: ["html"],
  }),
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  if (process.send) {
    process.send({ type: "READY" });
  }
});
