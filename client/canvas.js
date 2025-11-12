const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

export class Canvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.off = document.createElement("canvas");
    this.offCtx = this.off.getContext("2d");

    this.tool = "brush";
    this.color = "#0b63ff";
    this.size = 6;

    this.points = [];
    this.history = [];
    this.previewStrokes = new Map();

    this.resize();
    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.canvas);
    window.addEventListener("resize", () => this.resize());
  }

  setTool(t) { this.tool = t; }
  setColor(c) { this.color = c; }
  setSize(s) { this.size = s; }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(300, rect.width);
    const h = Math.max(300, rect.height);
    this.canvas.width = Math.floor(w * DPR);
    this.canvas.height = Math.floor(h * DPR);
    this.off.width = this.canvas.width;
    this.off.height = this.canvas.height;
    this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    this.offCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    this.redraw();
  }

  clearAll() {
    this.offCtx.clearRect(0, 0, this.off.width, this.off.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawPath(ctx, points, { color, size, tool }) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  }

  redraw() {
    this.clearAll();
    for (const op of this.history) {
      this.drawPath(this.offCtx, op.points, { color: op.color, size: op.size, tool: op.tool });
    }
    this.ctx.drawImage(this.off, 0, 0);
  }

  applyOp(op) {
    this.history.push(op);
    this.drawPath(this.offCtx, op.points, { color: op.color, size: op.size, tool: op.tool });
    this.ctx.drawImage(this.off, 0, 0);
  }

  setHistory(ops) { this.history = ops.slice(); this.redraw(); }

  setPreview(userId, payload) { this.previewStrokes.set(userId, payload); this.renderPreviews(); }
  removePreview(userId) { this.previewStrokes.delete(userId); this.renderPreviews(); }

  renderPreviews() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.off, 0, 0);
    for (const [, p] of this.previewStrokes) {
      this.drawPath(this.ctx, p.points, {
        color: p.tool === "eraser" ? "#000" : p.color, size: p.size, tool: p.tool
      });
    }
  }
}
