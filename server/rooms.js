import { DrawingState } from "./drawing-state.js";

const PALETTE = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0",
  "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8",
  "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
];

export class Rooms {
  constructor() {
    this.rooms = new Map();
  }

  ensure(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        users: new Map(),
        state: new DrawingState(),
        colorIdx: 0,
      });
    }
    return this.rooms.get(roomId);
  }

  join(roomId, socket) {
    const room = this.ensure(roomId);
    const color = PALETTE[room.colorIdx % PALETTE.length];
    room.colorIdx++;
    const user = { id: socket.id, name: `User-${socket.id.slice(0, 4)}`, color };
    room.users.set(socket.id, user);
    return { room, user };
  }

  leave(roomId, socketId) {
    const room = this.ensure(roomId);
    room.users.delete(socketId);
  }
}
