// server.js
import express, { json } from "express";
import { createServer } from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(json());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // during dev allow all. Lock this down in production.
    methods: ["GET", "POST"],
  },
});

// In-memory store per room (replace with DB later)
const rooms = {}; 
// rooms[roomId] = { content: "...", users: { socketId: {name, color}} }

function randomColor() {
  const colors = ["#f97316", "#06b6d4", "#a78bfa", "#f472b6", "#34d399", "#f87171"];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("join-room", ({ roomId, user }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    const name = user?.name || `User-${socket.id.slice(0, 4)}`;
    const color = user?.color || randomColor();

    // init room if not exists
    if (!rooms[roomId]) rooms[roomId] = { content: "", users: {} };

    // add user
    rooms[roomId].users[socket.id] = { name, color };

    // broadcast user list update
    io.to(roomId).emit("presence", {
      users: Object.entries(rooms[roomId].users).map(([id, u]) => ({ id, ...u })),
    });

    // send existing content to the newly joined client
    socket.emit("init", {
      content: rooms[roomId].content,
      users: Object.entries(rooms[roomId].users).map(([id, u]) => ({ id, ...u })),
    });

    console.log(`${name} joined ${roomId}`);
  });

  // receive content changes (full content)
  socket.on("content-change", ({ roomId, content }) => {
    if (!rooms[roomId]) rooms[roomId] = { content: "", users: {} };
    rooms[roomId].content = content;
    // broadcast to other clients in room
    socket.to(roomId).emit("content-change", { content, from: socket.id });
  });

  // receive cursor position updates
  socket.on("cursor-change", ({ roomId, cursor }) => {
    if (!rooms[roomId]) return;
    // update server-side user cursor (optional)
    if (rooms[roomId].users[socket.id]) rooms[roomId].users[socket.id].cursor = cursor;
    // broadcast to others
    socket.to(roomId).emit("cursor-change", { id: socket.id, cursor });
  });

  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      delete rooms[roomId].users[socket.id];
      io.to(roomId).emit("presence", {
        users: Object.entries(rooms[roomId].users).map(([id, u]) => ({ id, ...u })),
      });
      // optionally delete room if empty
      if (Object.keys(rooms[roomId].users).length === 0) {
        // keep content or remove depending on your design:
        // delete rooms[roomId];
      }
    }
    console.log("socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
