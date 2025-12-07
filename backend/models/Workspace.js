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
    children: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { _id: false } // IMPORTANT: prevents MongoDB from creating extra _id fields for each file
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
      required: true,
      unique: true,
      default: uuidv4,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    allowedUsers: {
      type: [String],
      default: [],
    },

    /* ---------- Saved Editor State ---------- */
    files: {
      type: [fileSchema],
      default: [],
    },

    openTabs: {
      type: Array,
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
