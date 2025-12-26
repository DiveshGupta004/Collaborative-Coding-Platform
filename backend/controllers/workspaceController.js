import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import { nanoid } from "nanoid";
import { sendMail } from "../utils/sendMail.js";
import {
  collaboratorAddedTemplate,
  inviteUserTemplate,
} from "../utils/emailTemplates.js";

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

    const workspace = await Workspace.findOne({ roomId });
    if (!workspace)
      return res.status(404).json({ message: "Workspace not found" });

    if (String(workspace.owner) !== String(req.user.id))
      return res.status(403).json({ message: "Only owner can add collaborators" });

    const trimmedEmail = email.trim();

    workspace.allowedUsers ||= [];
    workspace.collaborators ||= [];

    if (workspace.allowedUsers.includes(trimmedEmail)) {
      return res.status(400).json({ message: "User already added" });
    }

    const user = await User.findOne({ email: trimmedEmail });

    const roomLink = `${process.env.FRONTEND_URL}/room/${roomId}`;

    if (user) {
      workspace.allowedUsers.push(trimmedEmail);
      workspace.collaborators.push(user._id);
      await workspace.save();

      await sendMail({
        to: trimmedEmail,
        subject: "You were added to a workspace",
        html: collaboratorAddedTemplate({
          projectName: workspace.projectName,
          roomLink,
        }),
      });

      return res.json({ message: "Collaborator added and notified" });
    }

    await sendMail({
      to: trimmedEmail,
      subject: "Invitation to collaborate on CodeMate",
      html: inviteUserTemplate({
        projectName: workspace.projectName,
        signupLink: `${process.env.FRONTEND_URL}/signup`,
      }),
    });

    return res.status(404).json({
      message: "User not registered. Invitation email sent.",
    });

  } catch (err) {
    console.error("ADD COLLABORATOR ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const checkRoomAccess = async (req, res) => {
  try {
    const { roomId } = req.params;

    const workspace = await Workspace.findOne({ roomId });
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!workspace.allowedUsers.includes(userEmail)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



/* ---------------- REMOVE COLLABORATOR ---------------- */
export const removeCollaborator = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { email } = req.body;

    const workspace = await Workspace.findOne({ roomId });
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (String(workspace.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only owner can remove collaborators" });
    }

    workspace.allowedUsers = workspace.allowedUsers.filter(
      (e) => e !== email
    );

    await workspace.save();

    return res.status(200).json({
      message: "Collaborator removed successfully",
      allowedUsers: workspace.allowedUsers,
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
      .populate("owner", "email username");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const users = await User.find(
      { email: { $in: workspace.allowedUsers } },
      "email username"
    );

    const collaborators = users.filter(
      (u) => u.email !== workspace.owner.email
    );

    res.json({
      owner: workspace.owner,
      collaborators,
    });
  } catch (err) {
    console.error("GET COLLABORATORS ERROR:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};




/* ------ Load Workspace Files ------ */
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


/* ------ Save Workspace Files ------ */
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
