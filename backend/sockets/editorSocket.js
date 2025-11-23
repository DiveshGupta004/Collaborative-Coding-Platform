import Room from "../models/Room.js";
import Workspace from "../models/Workspace.js";

export default function editorSocket(socket, io) {
  console.log("🔌 User connected:", socket.id);

  socket.on("join-room", async ({ roomId, user }) => {
    try {
      console.log("JOIN-ROOM received:", roomId, user?.email);
      if (!roomId) {
        socket.emit("access-denied", "Missing roomId.");
        return;
      }
      if (!user || !user.email) {
        socket.emit("access-denied", "Invalid user.");
        return;
      }

      const workspace = await Workspace.findOne({ roomId });
      if (!workspace) {
        socket.emit("access-denied", "Workspace not found.");
        return;
      }

      const ownerEmail = workspace.owner?.email?.toLowerCase();
      const userEmail = (user.email || "").toLowerCase();
      const allowed = workspace.allowedUsers.map((e) => String(e).toLowerCase());

      const isAllowed = userEmail === ownerEmail || allowed.includes(userEmail);
      if (!isAllowed) {
        socket.emit("access-denied", "You are not allowed to join this workspace.");
        return;
      }

      socket.join(roomId);

      let room = await Room.findOne({ roomId });
      if (!room) room = await Room.create({ roomId, code: "" });

      socket.emit("joined-authorized");
      socket.emit("load-code", room.code);
      socket.to(roomId).emit("user-joined", { email: userEmail });

      console.log(`✔ ${userEmail} joined ${roomId}`);
    } catch (err) {
      console.error("JOIN ERROR:", err);
      socket.emit("access-denied", "Server error.");
    }
  });

  socket.on("code-change", async ({ roomId, code }) => {
    try {
      socket.to(roomId).emit("receive-changes", code);
      await Room.findOneAndUpdate({ roomId }, { code }, { upsert: true });
    } catch (err) {
      console.error("CODE UPDATE ERROR:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
}
