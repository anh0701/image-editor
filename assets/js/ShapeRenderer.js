class ShapeRenderer {
    constructor(canvas) {
        if (!canvas) throw new Error("Canvas is required");

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.shapes = [];
        this.selectedShape = null;

        this.history = [];
        this.historyIndex = -1;

        this.dragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
        canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    }

    addShape(shape) {
        this.shapes.push(shape);
        this.render();
    }

    selectShape(shapeId) {
        this.selectedShape = this.shapes.find(s => s.id === shapeId) || null;
        this.render();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        this.clear();
        for (const shape of this.shapes) {
            shape.draw(this.ctx);
        }

        if (this.selectedShape) {
            this.drawSelectionBox(this.selectedShape);
        }
    }

    drawSelectionBox(shape) {
        const { x, y, w, h } = shape.getBounds();
        this.ctx.save();
        this.ctx.strokeStyle = "blue";
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.restore();
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.pickShape(x, y);
    }

    pickShape(x, y) {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.shapes[i].isPointInside(x, y)) {
                this.selectedShape = this.shapes[i];
                this.render();
                return;
            }
        }

        this.selectedShape = null;
        this.render();
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.pickShape(x, y);

        if (this.selectedShape) {
            this.dragging = true;
            this.dragOffsetX = x - this.selectedShape.x;
            this.dragOffsetY = y - this.selectedShape.y;
        }
    }

    handleMouseMove(e) {
        if (!this.dragging || !this.selectedShape) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.selectedShape.x = x - this.dragOffsetX;
        this.selectedShape.y = y - this.dragOffsetY;

        this.render();
    }

    handleMouseUp(e) {
        this.dragging = false;
    }

};



