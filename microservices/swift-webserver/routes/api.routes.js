import express from "express";
import StartRouter from "./account/start";
import { AccessTokenRenewalController } from "./account/start/controller/access.token.renewal";
import RecoveryRouter from "./account/recovery";
// API ROUTES (Mount everything under /api)
const ApiRouter = express.Router();
if (process.env.ENV == "test") {
  ApiRouter.get("/protected", (req, res) => {
    res.json({ message: "made it to the protected route." });
  });
}

ApiRouter.get("/white-listed", (req, res) => {
  res.json({ message: "made it to the whitelisted route." });
});
ApiRouter.use("/start", StartRouter);
ApiRouter.use("/account/recovery", RecoveryRouter);
ApiRouter.get("/access-token", AccessTokenRenewalController);
export default ApiRouter;
