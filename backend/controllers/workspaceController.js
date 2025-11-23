import Workspace from "../models/Workspace.js";
import { nanoid } from "nanoid";

export const createWorkspace = async (req, res) => {
  try {
    const { projectName, collaborators } = req.body;

    const roomId = nanoid(10);

    const workspace = await Workspace.create({
      projectName,
      roomId,
      owner: req.user.id,
      allowedUsers: [req.user.email, ...(collaborators || [])],
    });

    res.status(201).json({
      message: "Workspace created",
      workspace,
    });

  } catch (error) {
    console.error("CREATE WORKSPACE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
