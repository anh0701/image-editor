import { BaseShape } from "./BaseShape.js";

export class CircleShape extends BaseShape {
  constructor(x, y, radius, options = {}) {
    super("circle");

    this.x = x;
    this.y = y;
    this.radius = radius;

    this.color = options.color || "#000";
    this.lineWidth = options.lineWidth || 3;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      w: this.radius * 2,
      h: this.radius * 2
    };
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  toJSON() {
    return {
      type: this.type,
      x: this.x,
      y: this.y,
      radius: this.radius,
      color: this.color,
      lineWidth: this.lineWidth
    };
  }
}
