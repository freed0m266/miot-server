import { RequestHandler } from "express";
import {
  createDesksService,
  deleteDesksService,
  getDesksService,
} from "../services/desks.service";

type GetRequestParams = {
  zoneId: string;
  deskIds?: string[];
  count?: number;
  unit?: "day" | "week" | "month" | "year";
};

type PostDeleteRequestParams = {
  zoneId: string;
  deskId: string;
};

export const getDesks: RequestHandler = (req, res, next) => {
  const request = req.query as unknown as GetRequestParams;

  const data = getDesksService(request);
  res.status(200).json({ data });
};

export const createDesk: RequestHandler = (req, res, next) => {
  const request = req.query as unknown as PostDeleteRequestParams;

  const data = createDesksService(request);
  res.status(501).json({ data });
};

export const deleteDesk: RequestHandler = (req, res, next) => {
  const request = req.query as unknown as PostDeleteRequestParams;

  const data = deleteDesksService(request);
  res.status(501).json({ data });
};
