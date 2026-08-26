import express from "express";
import StartRouter from "./account/start";
// API ROUTES (Mount everything under /api)
const ApiRouter = express.Router();

ApiRouter.use("/start", StartRouter);
export default ApiRouter;
