import { BaseShape } from "./BaseShape.js";

export class PenShape extends BaseShape {
  constructor(points, options = {}) {
    super("pen");

    this.points = points;

    this.color = options.color || "#000";
    this.lineWidth = options.lineWidth || 3;
  }

  draw(ctx) {
    if (!this.points.length) return;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    this.points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    );
    ctx.stroke();
    ctx.restore();
  }

  addPoint(p) {
    this.points.push(p);
  }

  getBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    if (minX === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: minX - this.lineWidth,
      y: minY - this.lineWidth,
      w: (maxX - minX) + this.lineWidth * 2,
      h: (maxY - minY) + this.lineWidth * 2
    };
  }

  move(dx, dy) {
    this.points.forEach(p => {
      p.x += dx;
      p.y += dy;
    });
  }

  toJSON() {
    return {
      type: this.type,
      points: this.points,
      color: this.color,
      lineWidth: this.lineWidth
    };
  }
}
