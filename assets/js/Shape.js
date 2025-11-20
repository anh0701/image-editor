class Shape {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
    }

    draw(ctx) {
        throw new Error("draw() must be implemented");
    }

    getBounds() {
        throw new Error("getBounds() must be implemented");
    }
};

class Rectangle extends Shape {
    constructor(id, x, y, w, h, color = "#000") {
        super(id, x, y);
        this.w = w;
        this.h = h;
        this.color = color;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    isPointInside(px, py) {
        return (
            px >= this.x &&
            px <= this.x + this.w &&
            py >= this.y &&
            py <= this.y + this.h
        );
    }
}


class Circle extends Shape {
    constructor(id, x, y, r, color = "#000") {
        super(id, x, y);
        this.r = r;
        this.color = color;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    getBounds() {
        return {
            x: this.x - this.r,
            y: this.y - this.r,
            w: this.r * 2,
            h: this.r * 2
        };
    }

    isPointInside(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return dx * dx + dy * dy <= this.r * this.r;
    }
}

