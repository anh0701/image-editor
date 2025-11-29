import { BaseShape } from "./BaseShape.js";

export class TextShape extends BaseShape {
  constructor(x, y, text, options = {}) {
    super("text");

    this.x = x;
    this.y = y;
    this.text = text;

    this.color = options.color || "#000";
    this.fontSize = options.fontSize || 20;
    this.align = options.align || "left";
  }

  draw(ctx) {
    ctx.save();
    ctx.font = `${this.fontSize}px sans-serif`;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.align;
    ctx.textBaseline = "top";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }

  getBounds(ctx) {
    ctx.save();
    ctx.font = `${this.fontSize}px sans-serif`;
    const w = ctx.measureText(this.text).width;
    ctx.restore();

    return {
      x: this.x,
      y: this.y,
      w,
      h: this.fontSize * 1.4
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
      text: this.text,
      color: this.color,
      fontSize: this.fontSize,
      align: this.align,
      maxWidth: this.maxWidth
    };
  }
}
