import { Canvas } from "./canvas.js";
import { connect } from "./websocket.js";

// Helpers
const $ = (s) => document.querySelector(s);
const roomId = new URL(location.href).searchParams.get("room") || "lobby";

// Core
const canvasEl = $("#canvas");
const cvs = new Canvas(canvasEl);
const { socket, ping } = connect(roomId);

// UI wires
const usersEl = $("#users");
const cursorsEl = $("#cursors");
const colorEl = $("#color");
const sizeEl = $("#size");
let me = null;
let users = new Map(); // id -> user
let drawing = false;

function setActiveTool(t) {
  document.querySelectorAll(".side .tool").forEach(b => b.classList.remove("active"));
  document.querySelector(`.side .tool[data-tool="${t}"]`)?.classList.add("active");
  cvs.setTool(t);
}
document.querySelectorAll(".side .tool").forEach(btn => {
  btn.addEventListener("click", () => setActiveTool(btn.dataset.tool));
});
$("#undo").onclick = () => socket.emit("undo");
$("#redo").onclick = () => socket.emit("redo");
colorEl.oninput = (e) => cvs.setColor(e.target.value);
sizeEl.oninput = (e) => cvs.setSize(Number(e.target.value));

// keyboard
addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); socket.emit("undo"); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); socket.emit("redo"); }
  if (e.key.toLowerCase() === "b") setActiveTool("brush");
  if (e.key.toLowerCase() === "e") setActiveTool("eraser");
});

// Presence UI
function renderUsers() {
  usersEl.innerHTML = "";
  for (const u of users.values()) {
    const tpl = $("#user-pill");
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".dot").style.background = u.color;
    node.querySelector(".name").textContent = u.name + (u.id === me?.id ? " (you)" : "");
    usersEl.appendChild(node);
  }
}

function upsertCursor(userId, x, y) {
  let el = cursorsEl.querySelector(`[data-id="${userId}"]`);
  if (!el) {
    el = document.createElement("div");
    el.className = "cursor";
    el.dataset.id = userId;
    el.innerHTML = `<div class="ring"></div><div class="label"></div>`;
    cursorsEl.appendChild(el);
  }
  const u = users.get(userId);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.querySelector(".ring").style.borderColor = u?.color || "#999";
  el.querySelector(".label").textContent = u?.name || "User";
}

function removeCursor(userId) {
  cursorsEl.querySelector(`[data-id="${userId}"]`)?.remove();
}

// Socket events
socket.on("init", ({ me: _me, users: list, ops }) => {
  me = _me; users = new Map(list.map(u => [u.id, u]));
  cvs.setHistory(ops);
  cvs.setColor(_me.color);
  setActiveTool("brush");
  renderUsers();
  ping((ms) => { $("#latency").textContent = `${ms} ms`; });
});

socket.on("user:join", (user) => { users.set(user.id, user); renderUsers(); });
socket.on("user:leave", ({ id }) => { users.delete(id); removeCursor(id); renderUsers(); });

socket.on("stroke:preview", ({ userId, points, tool, color, size }) => {
  cvs.setPreview(userId, { points, tool, color, size });
});
socket.on("op:add", (op) => { cvs.applyOp(op); cvs.removePreview(op.userId); });
socket.on("op:undone", ({ id }) => { cvs.setHistory(cvs.history.filter(o => o.id !== id)); });
socket.on("op:redone", () => { socket.emit("request:snapshot"); });
socket.on("cursor", ({ userId, x, y }) => { upsertCursor(userId, x, y); });

// Local drawing capture
function posFromEvent(e) {
  const r = canvasEl.getBoundingClientRect();
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

let batch = []; let batchTimer = null;
function startStroke(p) { drawing = true; cvs.points = [p]; batch = [p]; }
function extendStroke(p) {
  if (!drawing) return;
  cvs.points.push(p);
  cvs.setPreview(me.id, { points: cvs.points, tool: cvs.tool, color: cvs.color, size: cvs.size });
  batch.push(p);
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      socket.emit("stroke:preview", { points: batch, tool: cvs.tool, color: cvs.color, size: cvs.size });
      batch = []; batchTimer = null;
    }, 30);
  }
}
function endStroke() {
  if (!drawing) return;
  drawing = false;
  socket.emit("stroke:commit", { tool: cvs.tool, color: cvs.color, size: cvs.size, points: cvs.points });
  cvs.points = [];
  cvs.removePreview(me.id);
}

// Cursor broadcast (25Hz)
let lastCursor = 0;
function sendCursor(x, y) {
  const now = performance.now();
  if (now - lastCursor > 40) { lastCursor = now; socket.emit("cursor", { x, y }); }
}

// Mouse & touch listeners
canvasEl.addEventListener("mousedown", (e) => startStroke(posFromEvent(e)));
canvasEl.addEventListener("mousemove", (e) => { const p = posFromEvent(e); extendStroke(p); sendCursor(p.x, p.y); });
window.addEventListener("mouseup", endStroke);

canvasEl.addEventListener("touchstart", (e) => { startStroke(posFromEvent(e)); e.preventDefault(); }, { passive:false });
canvasEl.addEventListener("touchmove", (e) => { const p = posFromEvent(e); extendStroke(p); sendCursor(p.x, p.y); e.preventDefault(); }, { passive:false });
canvasEl.addEventListener("touchend", endStroke);
