import express from "express";
import { createWorkspace } from "../controllers/workspaceController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/create", auth, createWorkspace);
export default router;
