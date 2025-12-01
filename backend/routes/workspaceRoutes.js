import express from "express";
import { createWorkspace, getWorkspaces, deleteWorkspace } from "../controllers/workspaceController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

/* CREATE WORKSPACE */
router.post("/create", auth, createWorkspace);

/* GET USER WORKSPACES */
router.get("/", auth, getWorkspaces);

/* DELETE WORKSPACE */
router.delete("/:id", auth, deleteWorkspace);

export default router;
