import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

/* ---------- File Schema (Recursive + Stable) ---------- */
const fileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["file", "folder"], required: true },
    content: { type: String, default: "" },

    // Recursive structure
    children: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { _id: false }
);

/* ---------- Workspace Schema ---------- */
const workspaceSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    roomId: {
      type: String,
      unique: true,
      default: uuidv4,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ✅ SINGLE SOURCE OF TRUTH */
    allowedUsers: {
      type: [String], // emails (owner + collaborators)
      required: true,
      default: [],
    },

    /* ---------- Editor State ---------- */
    files: {
      type: [fileSchema],
      default: [],
    },

    openTabs: {
      type: [String],
      default: [],
    },

    activeFileId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Workspace", workspaceSchema);
