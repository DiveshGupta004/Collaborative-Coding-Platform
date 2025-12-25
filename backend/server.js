import "./config/env.js";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import workspaceRoutes from "./routes/workspaceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import editorSocket from "./sockets/editorSocket.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || "CodeMate" })
  .then(() => console.log("✔ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

app.get("/", (_, res) => res.send("🚀 Backend Running"));
app.use("/api/workspace", workspaceRoutes);
app.use("/api/auth", authRoutes);

/* ---------------------- SOCKET FIX ---------------------- */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
});

io.on("connection", (socket) => {
  console.log(`🟢 Socket Connected: ${socket.id}`);
  editorSocket(socket, io);

  socket.on("disconnect", () => {
    console.log(`🔴 Socket Disconnected: ${socket.id}`);
  });
});

server.listen(process.env.PORT || 4000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 4000}`)
);
