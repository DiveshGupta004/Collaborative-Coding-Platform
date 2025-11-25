import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const workspaceSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
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
  allowedUsers: {
    type: [String],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Workspace", workspaceSchema);
