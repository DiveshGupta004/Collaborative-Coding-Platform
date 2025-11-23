import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import workspaceRoutes from "./routes/workspaceRoutes.js";
import authRoutes from "./routes/authRoutes.js"; // keep your existing auth routes
import editorSocket from "./sockets/editorSocket.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || "CodeMate" })
  .then(() => console.log("✔ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

app.get("/", (req, res) => res.send("Collaborative Editor Backend Running"));
app.use("/api/workspace", workspaceRoutes);
app.use("/api/auth", authRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connection:", socket.id);
  editorSocket(socket, io);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
