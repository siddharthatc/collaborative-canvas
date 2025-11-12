export function connect(roomId) {
  const socket = io({ query: { room: roomId } });
  // expose simple ping to show latency (piggyback on any event)
  const ping = (cb) => {
    const t0 = performance.now();
    socket.timeout(2000).emit("cursor", { ping: true }, () => {
      cb(Math.round(performance.now() - t0));
    });
  };
  return { socket, ping };
}
