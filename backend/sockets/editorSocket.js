// backend/sockets/editorSocket.js
import Workspace from "../models/Workspace.js";
import jwt from "jsonwebtoken";
import { runProjectStream } from "../runners/execRunner.js";
import { v4 as uuidv4 } from "uuid";

export default function editorSocket(socket, io) {
  // auth attach
  if (socket.handshake?.auth?.token) {
    try {
      const decoded = jwt.verify(
        socket.handshake.auth.token,
        process.env.JWT_SECRET || "secret"
      );
      socket.user = decoded;
    } catch (e) {}
  }

  // join-room
  socket.on("join-room", async ({ roomId, user }) => {
    try {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.user = user || socket.user || null;

      let workspaceDoc = null;
      try {
        workspaceDoc = await Workspace.findOne({ roomId }).lean();
      } catch {}

      const code =
        workspaceDoc?.files?.length && workspaceDoc.files[0]?.content
          ? workspaceDoc.files[0].content
          : "";

      socket.emit("load-code", code);
      io.to(socket.id).emit("joined-authorized");
    } catch (err) {
      socket.emit("access-denied", "Unable to join room");
    }
  });

  socket.on("code-change", ({ roomId, code }) => {
    if (!roomId) return;
    socket.to(roomId).emit("receive-changes", code);
  });

  // RUN PROJECT
  socket.on(
    "run-project",
    async ({ roomId, files, entry, language, timeout }) => {
      try {
        if (!roomId || !files || !entry || !language) {
          socket.emit("run-output", {
            runId: null,
            text: "Invalid run request\n",
          });
          return;
        }

        if (!socket.rooms.has(roomId)) {
          socket.emit("run-output", {
            runId: null,
            text: "You are not in this room.\n",
          });
          return;
        }

        const runId = uuidv4();

        runProjectStream({
          files,
          entry,
          language,
          socket,
          runId,
          timeout: timeout || 15000,
        });

        io.to(roomId).emit("run-started", {
          runId,
          startedBy: socket.user?.username || socket.id,
        });
      } catch (err) {
        socket.emit("run-output", {
          runId: null,
          text: `Run error: ${String(err)}\n`,
        });
      }
    }
  );

  socket.on("disconnect", () => {});
}
