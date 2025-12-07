import express from "express";
import {
  createWorkspace,
  getWorkspaces,
  deleteWorkspace,
  addCollaborator,
  removeCollaborator,
  getCollaborators,
  loadWorkspace,
  saveWorkspaceData,
} from "../controllers/workspaceController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

/* EXISTING ROUTES */
router.post("/create", auth, createWorkspace);
router.get("/", auth, getWorkspaces);
router.delete("/:id", auth, deleteWorkspace);
router.get("/:roomId/members", auth, getCollaborators);
router.post("/:roomId/add", auth, addCollaborator);
router.post("/:roomId/remove", auth, removeCollaborator);

/* NEW ROUTES (SAVING + LOADING WORKSPACE FILES) */
router.get("/:roomId/load", auth, loadWorkspace);
router.put("/:roomId/save", auth, saveWorkspaceData);

export default router;
