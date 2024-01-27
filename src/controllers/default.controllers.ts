import { RequestHandler } from "express";
import { apiKey } from "../main";

export const getDefault: RequestHandler = async (req, res, next) => {
  const reqApiKey = req.header("api-key") || req.header("Api-Key");
  if (reqApiKey !== apiKey) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.status(200).json({ data: "success" });
};
