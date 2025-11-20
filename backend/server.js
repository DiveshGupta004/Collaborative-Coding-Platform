import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";

import editorSocket from "./sockets/editorSocket.js";
import authRoutes from "./routes/authRoutes.js";


const app = express();
const server = http.createServer(app);

// ----------- SOCKET.IO CONFIG -----------
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ----------- MIDDLEWARES -----------
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ----------- DATABASE CONNECTION -----------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✔ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// ----------- ROUTES -----------
app.get("/", (req, res) => {
  res.send("Collaborative Editor Backend Running");
});

app.use("/api/auth", authRoutes);

// ----------- SOCKET EVENTS -----------
io.on("connection", (socket) => {
  console.log("🔌 User Connected:", socket.id);
  editorSocket(socket, io);

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected:", socket.id);
  });
});

// ----------- START SERVER -----------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
