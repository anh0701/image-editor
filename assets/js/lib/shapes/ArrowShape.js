import { BaseShape } from "./BaseShape.js";

export class ArrowShape extends BaseShape {
  constructor(x1, y1, x2, y2, options = {}) {
    super("arrow");

    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.color = options.color || "#000";
    this.lineWidth = options.lineWidth || 3;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.lineWidth;

    const headlen = 10 + this.lineWidth;
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.x2, this.y2);
    ctx.lineTo(
      this.x2 - headlen * Math.cos(angle - Math.PI / 6),
      this.y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      this.x2 - headlen * Math.cos(angle + Math.PI / 6),
      this.y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  getBounds() {
    const x = Math.min(this.x1, this.x2);
    const y = Math.min(this.y1, this.y2);
    const w = Math.abs(this.x2 - this.x1);
    const h = Math.abs(this.y2 - this.y1);
    return { x, y, w, h };
  }

  move(dx, dy) {
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
  }

  toJSON() {
    return {
      type: this.type,
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
      color: this.color,
      lineWidth: this.lineWidth
    };
  }
}
