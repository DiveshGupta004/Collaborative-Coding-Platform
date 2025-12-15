import Workspace from "../models/Workspace.js";
import jwt from "jsonwebtoken";
import { runProjectStream } from "../runners/execRunner.js";
import { v4 as uuidv4 } from "uuid";

export default function editorSocket(socket, io) {

  /* ---------------- AUTH ATTACH ---------------- */
  if (socket.handshake?.auth?.token) {
    try {
      const decoded = jwt.verify(
        socket.handshake.auth.token,
        process.env.JWT_SECRET || "secret"
      );
      socket.user = decoded;
    } catch {}
  }

  /* ---------------- JOIN ROOM ---------------- */
  socket.on("join-room", async ({ roomId, user }) => {
    try {
      const email = user?.email || socket.user?.email;
      if (!email) return socket.emit("access-denied");

      const workspace = await Workspace.findOne({ roomId });
      if (!workspace) return socket.emit("access-denied");

      // 🔐 OWNER OR ALLOWED USER ONLY
      if (!workspace.allowedUsers.includes(email)) {
        return socket.emit("access-denied");
      }

      socket.join(roomId);
      socket.roomId = roomId;
      socket.email = email;
      socket.user = user || socket.user;

      socket.emit("load-code", workspace.files || []);
      socket.emit("joined-authorized");

      // notify others
      io.to(roomId).emit("user-joined", {
        email,
        username: socket.user?.username,
      });

    } catch (err) {
      console.error("JOIN ROOM ERROR:", err);
      socket.emit("access-denied");
    }
  });

  /* ---------------- CODE SYNC ---------------- */
  socket.on("code-change", ({ roomId, code }) => {
    socket.to(roomId).emit("receive-changes", code);
  });

  /* ---------------- RUN PROJECT ---------------- */
  socket.on("run-project", ({ roomId, files, entry, language, timeout }) => {
    const runId = uuidv4();

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
      onStdout: (msg) => io.in(roomId).emit("run-output", { text: msg, isErr: false }),
      onStderr: (msg) => io.in(roomId).emit("run-output", { text: msg, isErr: true }),
      onClose: (code) => io.in(roomId).emit("run-finished", { code }),
    });
  });

  /* ---------------- KICK COLLABORATOR ---------------- */
  socket.on("kick-collaborator", async ({ roomId, email }) => {
    try {
      const workspace = await Workspace.findOne({ roomId });
      if (!workspace) return;

      workspace.allowedUsers = workspace.allowedUsers.filter(
        (e) => e !== email
      );
      await workspace.save();

      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach((s) => {
        if (s.email === email) {
          s.leave(roomId);
          s.emit("removed-from-workspace");
        }
      });

      io.to(roomId).emit("collaborator-removed", { email });
    } catch (err) {
      console.error("KICK COLLAB ERROR:", err);
    }
  });

  /* ---------------- DISCONNECT ---------------- */
  socket.on("disconnect", () => {
    if (socket.roomId) {
      io.to(socket.roomId).emit("user-left", {
        email: socket.email,
      });
    }
  });
}
