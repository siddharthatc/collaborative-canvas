import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { Rooms } from "./rooms.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "..", "client")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const rooms = new Rooms();

io.on("connection", (socket) => {
  const { room: roomId = "lobby" } = socket.handshake.query;
  const { room, user } = rooms.join(roomId, socket);
  socket.join(roomId);

  socket.emit("init", {
    me: user,
    users: Array.from(room.users.values()),
    ops: room.state.snapshot(),
  });

  socket.to(roomId).emit("user:join", user);

  socket.on("cursor", (payload) => {
    socket.to(roomId).emit("cursor", { userId: user.id, ...payload });
  });

  socket.on("stroke:preview", (payload) => {
    socket.to(roomId).emit("stroke:preview", { userId: user.id, ...payload });
  });

  socket.on("stroke:commit", (payload) => {
    const rec = room.state.addOperation({ userId: user.id, ...payload });
    io.to(roomId).emit("op:add", rec);
  });

  socket.on("undo", () => {
    const res = room.state.globalUndo();
    if (res) io.to(roomId).emit("op:undone", res);
  });

  socket.on("redo", () => {
    const res = room.state.globalRedo();
    if (res) io.to(roomId).emit("op:redone", res);
  });

  socket.on("request:snapshot", () => {
    socket.emit("init", {
      me: user,
      users: Array.from(room.users.values()),
      ops: room.state.snapshot(),
    });
  });

  socket.on("disconnect", () => {
    rooms.leave(roomId, socket.id);
    socket.to(roomId).emit("user:leave", { id: user.id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
