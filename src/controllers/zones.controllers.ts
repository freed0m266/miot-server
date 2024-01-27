import { RequestHandler } from "express";
import { apiKey } from "../main";
import { getZonesService } from "../services/zones.service";

export const getZones: RequestHandler = async (req, res, next) => {
  const reqApiKey = req.header("api-key") || req.header("Api-Key");
  if (reqApiKey !== apiKey) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const data = await getZonesService();
  res.status(200).json({ data });
};
