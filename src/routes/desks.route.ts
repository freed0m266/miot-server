import { Router } from "express";
import {
  createDesk,
  deleteDesk,
  getDesks,
} from "../controllers/desks.controllers";

const router = Router();
router.get("/", getDesks);
router.post("/", createDesk);
router.delete("/", deleteDesk);
export default router;
