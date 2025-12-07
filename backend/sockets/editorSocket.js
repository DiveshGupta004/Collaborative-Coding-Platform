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
    } catch (e) { }
  }

  // join-room
  socket.on("join-room", async ({ roomId, user }) => {
    try {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.user = user || socket.user || null;

      const workspaceDoc = await Workspace.findOne({ roomId }).lean().catch(() => { });

      socket.emit("load-code", workspaceDoc?.files || []);
      socket.emit("joined-authorized");
    } catch {
      socket.emit("access-denied");
    }
  });

  // real-time code sync
  socket.on("code-change", ({ roomId, code }) => {
    if (!roomId) return;
    socket.to(roomId).emit("receive-changes", code);
  });

  // run code handler
  socket.on("run-project", ({ roomId, files, entry, language, timeout }) => {
    const runId = uuidv4();

    // notify UI run started
    io.in(roomId).emit("run-started", {
      runId,
      startedBy: socket.user?.username || socket.id,
    });

    runProjectStream({
      files,
      entry,
      language,
      timeout,
      runId,

      onStdout: (msg) => {
        io.in(roomId).emit("run-output", { text: msg, isErr: false });
      },

      onStderr: (msg) => {
        io.in(roomId).emit("run-output", { text: msg, isErr: true });
      },

      onClose: (code) => {
        io.in(roomId).emit("run-finished", { code });
      },
    });
  });



  socket.on("disconnect", () => { });
}
