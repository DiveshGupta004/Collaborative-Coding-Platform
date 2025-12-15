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
    } catch { }
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

      // 🔥 SEND FULL WORKSPACE SNAPSHOT
      socket.emit("workspace-init", {
        files: workspace.files || [],
        openTabs: workspace.openTabs || [],
        activeFileId: workspace.activeFileId || null,
      });

      // Also emit old format for backward compatibility
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

  /* ---------------- FILE TREE SYNC ---------------- */
  socket.on("files-update", async ({ roomId, files }) => {
    socket.to(roomId).emit("files-sync", files);
  });

  /* ---------------- CODE SYNC (PER FILE) ---------------- */
  socket.on("code-change", ({ roomId, code, fileId }) => {
    // Support both formats
    if (fileId) {
      socket.to(roomId).emit("receive-changes", { fileId, code });
    } else {
      socket.to(roomId).emit("receive-changes", code);
    }
  });

  /* ---------------- CURSOR SYNC ---------------- */
  socket.on("cursor-move", ({ roomId, fileId, position }) => {
    socket.to(roomId).emit("cursor-update", {
      fileId,
      email: socket.email,
      position,
    });
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
      if (!socket.user?.id) return;

      const workspace = await Workspace.findOne({ roomId });
      if (!workspace) return;

      // 🔐 ONLY OWNER CAN REMOVE
      if (String(workspace.owner) !== String(socket.user.id)) {
        return socket.emit("action-denied", {
          message: "Only owner can remove collaborators",
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      // 🚫 Owner cannot remove self
      if (cleanEmail === socket.email) {
        return socket.emit("action-denied", {
          message: "Owner cannot remove themselves",
        });
      }

      // Remove from DB
      workspace.allowedUsers = workspace.allowedUsers
        .map(e => e.trim().toLowerCase())
        .filter(e => e !== cleanEmail);

      await workspace.save();

      // Kick active socket if connected
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach((s) => {
        if (s.email === cleanEmail) {
          s.leave(roomId);
          s.emit("user-kicked");
        }
      });

      io.to(roomId).emit("collaborator-removed", { email: cleanEmail });

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