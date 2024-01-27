import { Router } from "express";
import { getZones } from "../controllers/zones.controllers";

const router = Router();
router.get("/", getZones);
export default router;
