import { Router } from "express";
import { pushData } from "../controllers/data.controller";

const router = Router();
router.post("/", pushData);
export default router;
