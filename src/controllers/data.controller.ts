import { RequestHandler } from "express";
import { saveData } from "../services/data.service";

export type HardwarioPayload = {
  deskId: string;
  data: HardwarioMeasurement[];
};

export type HardwarioMeasurement = {
  timestamp: number;
  mean_min: number;
  mean_max: number;
  mean_avg: number;
  mean_mdn: number;
  rms_min: number;
  rms_max: number;
  rms_avg: number;
  rms_mdn: number;
};

export const pushData: RequestHandler = async (req, res, next) => {
  const request = req.body as unknown as HardwarioPayload;

  const reqApiKey = req.header("api-key") || req.header("Api-Key");
  if (reqApiKey !== process.env.HARDWARIO_TOKEN) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  await saveData(request);
  res.status(200).json({ data: "data" });
};
