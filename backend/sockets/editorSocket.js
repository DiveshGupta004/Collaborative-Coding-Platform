import Workspace from "../models/Workspace.js";
import Message from "../models/Message.js";

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

      if (!workspace.allowedUsers.includes(email)) {
        return socket.emit("access-denied");
      }

      socket.join(roomId);
      socket.roomId = roomId;
      socket.email = email;
      socket.user = user || socket.user;

      socket.emit("workspace-init", {
        files: workspace.files || [],
        openTabs: workspace.openTabs || [],
        activeFileId: workspace.activeFileId || null,
      });

      socket.emit("load-code", workspace.files || []);
      socket.emit("joined-authorized");

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

      if (String(workspace.owner) !== String(socket.user.id)) {
        return socket.emit("action-denied", {
          message: "Only owner can remove collaborators",
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (cleanEmail === socket.email) {
        return socket.emit("action-denied", {
          message: "Owner cannot remove themselves",
        });
      }

      workspace.allowedUsers = workspace.allowedUsers
        .map(e => e.trim().toLowerCase())
        .filter(e => e !== cleanEmail);

      await workspace.save();

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

  /* ---------------- MESSAGES ---------------- */
  
  socket.on("join-messages", async ({ roomId }) => {
    try {
      if (!socket.email) {
        if (socket.handshake?.auth?.token) {
          try {
            const decoded = jwt.verify(
              socket.handshake.auth.token,
              process.env.JWT_SECRET || "secret"
            );
            
            if (decoded.id) {
              const User = (await import("../models/User.js")).default;
              const user = await User.findById(decoded.id).select("email username");
              
              if (user) {
                socket.email = user.email;
                socket.user = {
                  id: decoded.id,
                  email: user.email,
                  username: user.username
                };
              }
            }
          } catch (err) {
            console.error("JWT verification error in join-messages:", err);
          }
        }
      }
      
      socket.join(roomId);
    } catch (err) {
      console.error("JOIN MESSAGES ERROR:", err);
    }
  });

  socket.on("typing", ({ roomId }) => {
    const typingData = {
      email: socket.email,
      username: socket.user?.username || socket.email?.split("@")[0],
    };
    
    socket.to(roomId).emit("user-typing", typingData);
  });

  socket.on("stop-typing", ({ roomId }) => {
    socket.to(roomId).emit("user-stopped-typing", {
      email: socket.email,
    });
  });

  socket.on("load-messages", async ({ roomId }) => {
    try {
      const messages = await Message.find({ roomId })
        .sort({ createdAt: 1 })
        .limit(200);
      
      socket.emit(
        "messages-loaded",
        messages.map((m) => ({
          id: m._id,
          email: m.email,
          username: m.username,
          text: m.text,
          timestamp: m.createdAt,
        }))
      );
    } catch (err) {
      console.error("LOAD MESSAGES ERROR:", err);
      socket.emit("messages-loaded", []);
    }
  });

  socket.on("send-message", async ({ roomId, email, text, timestamp }) => {
    if (!text?.trim()) return;

    try {
      const message = await Message.create({
        roomId,
        email: email || socket.email,
        username: socket.user?.username || (email || socket.email).split("@")[0],
        text: text.trim(),
      });

      io.to(roomId).emit("receive-message", {
        id: message._id,
        email: message.email,
        username: message.username,
        text: message.text,
        timestamp: message.createdAt,
      });

    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
    }
  });

  socket.on("clear-messages", async ({ roomId }) => {
    try {
      const workspace = await Workspace.findOne({ roomId });
      if (!workspace) return;

      if (String(workspace.owner) !== String(socket.user?.id)) {
        return socket.emit("action-denied", {
          message: "Only owner can clear messages",
        });
      }

      await Message.deleteMany({ roomId });

      io.to(roomId).emit("messages-cleared");

    } catch (err) {
      console.error("CLEAR MESSAGES ERROR:", err);
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