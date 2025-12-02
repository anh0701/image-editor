export class BaseShape {
  constructor(type) {
    this.type = type;
  }
  draw(ctx) {
    throw new Error('draw() not implemented');
  }
  getBounds(ctx) {
    throw new Error('getBounds() not implemented');
  }
  move(dx, dy) {
    throw new Error('move() not implemented');
  }
  toJSON() {
    return { type: this.type };
  }
}