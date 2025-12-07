// backend/controllers/workspaceController.js
import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import { nanoid } from "nanoid";

/* ---------------- CREATE WORKSPACE ---------------- */
export const createWorkspace = async (req, res) => {
  try {
    const { projectName } = req.body;

    if (!projectName) {
      return res.status(400).json({ message: "Project name is required." });
    }

    const roomId = nanoid(10);

    const workspace = await Workspace.create({
      projectName,
      roomId,
      owner: req.user.id,
      collaborators: [],
      allowedUsers: [req.user.email],
    });

    return res.status(201).json({
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.error("CREATE WORKSPACE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- GET USER WORKSPACES ---------------- */
export const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ owner: req.user.id });

    return res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.error("GET WORKSPACES ERROR:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------- DELETE WORKSPACE ---------------- */
export const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findOne({ _id: id, owner: req.user.id });

    if (!workspace) {
      return res
        .status(404)
        .json({ message: "Workspace not found or unauthorized." });
    }

    await Workspace.findByIdAndDelete(id);

    return res.status(200).json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("DELETE WORKSPACE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- ADD COLLABORATOR ---------------- */
export const addCollaborator = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const workspace = await Workspace.findOne({ roomId });
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (String(workspace.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only owner can add collaborators" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (workspace.collaborators.some((id) => String(id) === String(user._id))) {
      return res.status(400).json({ message: "User is already a collaborator" });
    }

    workspace.collaborators.push(user._id);
    await workspace.save();

    const populated = await Workspace.findOne({ roomId })
      .populate("owner", "username email")
      .populate("collaborators", "username email");

    return res.status(200).json({
      message: "Collaborator added successfully",
      workspace: populated,
    });
  } catch (error) {
    console.error("ADD COLLABORATOR ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- REMOVE COLLABORATOR ---------------- */
export const removeCollaborator = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { email } = req.body;

    const workspace = await Workspace.findOne({ roomId }).populate(
      "collaborators",
      "email"
    );
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (String(workspace.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only owner can remove collaborators" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    workspace.collaborators = workspace.collaborators.filter(
      (id) => String(id) !== String(user._id)
    );
    await workspace.save();

    const populated = await Workspace.findOne({ roomId })
      .populate("owner", "username email")
      .populate("collaborators", "username email");

    return res.status(200).json({
      message: "Collaborator removed successfully",
      workspace: populated,
    });
  } catch (error) {
    console.error("REMOVE COLLABORATOR ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCollaborators = async (req, res) => {
  try {
    const { roomId } = req.params;

    const workspace = await Workspace.findOne({ roomId })
      .populate("owner", "username email")
      .populate("collaborators", "username email");

    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    res.json({
      owner: workspace.owner,
      collaborators: workspace.collaborators
    });

  } catch (error) {
    console.error("GET COLLABORATORS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


/* ---------------------------------------------------------
   ✨ NEW FEATURE: SAVE + LOAD PROJECT FILES
---------------------------------------------------------- */

/* ------ Load Workspace Files (when opening editor) ------ */
export const loadWorkspace = async (req, res) => {
  try {
    const { roomId } = req.params;

    const workspace = await Workspace.findOne({ roomId }).lean();

    if (!workspace) {
      return res.json({ files: [], openTabs: [], activeFileId: null });
    }

    res.json({
      files: workspace.files || [],
      openTabs: workspace.openTabs || [],
      activeFileId: workspace.activeFileId || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ------ Save Workspace Files (Auto-save + Manual) ------ */
export const saveWorkspaceData = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { files, openTabs, activeFileId } = req.body;

    await Workspace.updateOne(
      { roomId },
      { files, openTabs, activeFileId },
      { upsert: true }
    );

    res.json({ success: true, message: "Workspace saved." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
