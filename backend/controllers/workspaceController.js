import Workspace from "../models/Workspace.js";
import { nanoid } from "nanoid";

/* ---------------- CREATE WORKSPACE ---------------- */
export const createWorkspace = async (req, res) => {
  try {
    const { projectName, collaborators } = req.body;

    if (!projectName) {
      return res.status(400).json({ message: "Project name is required." });
    }

    const roomId = nanoid(10);

    const workspace = await Workspace.create({
      projectName,
      roomId,
      owner: req.user.id,
      allowedUsers: [req.user.email, ...(collaborators || [])],
    });

    res.status(201).json({
      message: "Workspace created successfully",
      workspace,
    });

  } catch (error) {
    console.error("CREATE WORKSPACE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- GET USER WORKSPACES ---------------- */
// controllers/workspaceController.js
export const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ owner: req.user.id });

    res.status(200).json({
      success: true,
      workspaces,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/* ---------------- DELETE WORKSPACE ---------------- */
export const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findOne({ _id: id, owner: req.user.id });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found or unauthorized." });
    }

    await Workspace.findByIdAndDelete(id);

    res.status(200).json({ message: "Workspace deleted successfully" });

  } catch (error) {
    console.error("DELETE WORKSPACE ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
