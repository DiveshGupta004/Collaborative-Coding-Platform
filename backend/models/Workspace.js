import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
  },
  roomId: {         // ✅ FIX HERE
    type: String,
    required: true,
    unique: true,
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
