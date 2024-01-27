import { Router } from "express";
import { getDefault } from "../controllers/default.controllers";

const router = Router();
router.get("/", getDefault);
export default router;
