import { BaseShape } from "./BaseShape.js";

export class RectShape extends BaseShape {
  constructor(x1, y1, x2, y2, color, lineWidth) {
    super("rect");
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.lineWidth = lineWidth || 3;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
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
