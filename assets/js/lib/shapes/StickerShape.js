import { BaseShape } from "./BaseShape.js";

export class StickerShape extends BaseShape {
    constructor(x, y, img, width, height) {
        super('sticker');
        this.x = x;
        this.y = y;
        this.img = img; this.width = width || img.width; this.height = height || img.height;
    }
    draw(ctx) {
        ctx.drawImage(
            this.img,
            this.x,
            this.y,
            this.width,
            this.height
        );

    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            w: this.width,
            h: this.height
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
            src: this.src,
            width: this.width,
            height: this.height
        };
    }
}