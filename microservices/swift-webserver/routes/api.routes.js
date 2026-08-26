import express from "express";
import StartRouter from "./account/start";
// API ROUTES (Mount everything under /api)
const ApiRouter = express.Router();
ApiRouter.get("/protected", (req, res) => {
  res.json({ message: "made it to the protected route." });
});
ApiRouter.get("/white-listed", (req, res) => {
  res.json({ message: "made it to the whitelisted route." });
});
ApiRouter.use("/start", StartRouter);
export default ApiRouter;
