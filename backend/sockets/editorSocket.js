import Room from "../models/Room.js";

export default function editorSocket(socket, io) {
  console.log("User connected:", socket.id);

  // When user joins an editor room
  socket.on("join-room", async (roomId) => {
    socket.join(roomId);

    // Load existing room state
    let room = await Room.findOne({ roomId });

    if (!room) {
      room = await Room.create({ roomId });
    }

    // Send existing code to newly joined user
    socket.emit("load-code", room.code);

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // When code is changed
  socket.on("code-change", async ({ roomId, code }) => {
    // Broadcast to others
    socket.to(roomId).emit("receive-changes", code);

    // Save updated code to DB
    await Room.findOneAndUpdate(
      { roomId },
      { code },
      { new: true }
    );
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
}
