import { HistoryManager } from "./manager/HistoryManager.js";
import ImageLoader from "./manager/ImageLoader.js";
import { ArrowShape } from "./shapes/ArrowShape.js";
import { CircleShape } from "./shapes/CircleShape.js";
import { PenShape } from "./shapes/PenShape.js";
import { RectShape } from "./shapes/RectShape.js";
import { StickerShape } from "./shapes/StickerShape.js";
import { TextShape } from "./shapes/TextShape.js";

export class CanvasCore {

  constructor() {

    this.canvas = null;
    this.ctx = null;

    // state
    this.shapes = [];
    this.selectedShape = null;

    this.baseImageData = null;
    this.img = null;

    // config
    this.drawColor = "#000000";
    this.lineWidth = 3;
    this.fontSize = 20;
    this.textAlign = "left";

    // selection
    this.selectionRect = null;
    this.isSelecting = false;
    this.removeMode = "selfie";
    this.segmenter = null;

    // utilities
    this.history = new HistoryManager();
    this.loader = null;
  }

  // ---------------- INIT ----------------
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.loader = new ImageLoader(canvas);

    if (this.img) {
      canvas.width = this.img.width;
      canvas.height = this.img.height;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(this.img, 0, 0);
    } else {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        // try {
        const data = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = w; canvas.height = h;
        this.ctx.putImageData(data, 0, 0);
        // } 
        // catch {
        // canvas.width = w; canvas.height = h;
        // }
      }
    }

    this.baseImageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.saveHistory();
  }


  // ---------------- SHAPES ----------------
  getShapes() { return this.shapes; }
  getSelectedShape() { return this.selectedShape; }
  setSelectedShape(s) { this.selectedShape = s; }

  getCtx() { return this.ctx; }

  getDrawColor() { return this.drawColor; }
  getLineThickness() { return this.lineWidth; }
  getTextSize() { return this.fontSize; }
  getTextAlign() { return this.textAlign; }

  setDrawColor(c) { this.drawColor = c; }
  setLineWidth(w) { this.lineWidth = w; }
  setFontSize(f) { this.fontSize = f; }

  setConfig(conf) {
    if (conf.color !== undefined) this.drawColor = conf.color;
    if (conf.lineWidth !== undefined) this.lineWidth = conf.lineWidth;
    if (conf.fontSize !== undefined) this.fontSize = conf.fontSize;
    if (conf.textAlign !== undefined) this.textAlign = conf.textAlign;
  }

  getShapeBounds(shape) {
    if (!shape || typeof shape.getBounds !== "function")
      return { x: 0, y: 0, w: 0, h: 0 };
    return shape.getBounds(this.ctx);
  }

  moveShape(shape, dx, dy) {
    if (!shape || typeof shape.move !== "function") return;
    shape.move(dx, dy);
  }

  drawShape(ctx, shape) {
    if (!shape || typeof shape.draw !== "function") return;
    shape.draw(ctx);
  }


  redrawAll() {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    // ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.baseImageData)
      ctx.putImageData(this.baseImageData, 0, 0);

    this.shapes.forEach(s => this.drawShape(ctx, s));

    if (this.selectedShape) {
      const b = this.getShapeBounds(this.selectedShape);
      ctx.save();
      ctx.strokeStyle = "rgba(0,120,255,0.9)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }

    if (this.selectionRect && this.removeMode === "grabcut")
      this.drawSelectionRect();
  }

  // --------------- HISTORY ----------------
  saveHistory() {
    try {
      const snapshot = this.shapes.map(s =>
        s.toJSON ? s.toJSON() : JSON.parse(JSON.stringify(s))
      );
      this.history.push(snapshot);
    } catch (e) {
      console.warn("saveHistory failed", e);
    }
  }

  undo() {
    const state = this.history.undo();
    if (state) {
      this.shapes = state.map(obj => this.reviveShape(obj));
      this.redrawAll();
    }
  }

  redo() {
    const state = this.history.redo();
    if (state) {
      this.shapes = state.map(obj => this.reviveShape(obj));
      this.redrawAll();
    }
  }

  reviveShape(obj) {
    if (!obj || !obj.type) return obj;
    switch (obj.type) {
      case "rect": return new RectShape(obj.x1, obj.y1, obj.x2, obj.y2, obj);
      case "arrow": return new ArrowShape(obj.x1, obj.y1, obj.x2, obj.y2, obj);
      case "text": return new TextShape(obj.x, obj.y, obj.text, obj);
      case "pen": return new PenShape(obj.points, obj);
      case "circle": return new CircleShape(obj.x, obj.y, obj.radius, obj);
      case "sticker":
        const i = new Image();
        i.src = obj.src || "";
        return new StickerShape(obj.x, obj.y, i, obj.width, obj.height);
      default: return obj;
    }
  }


  addShape(shape) {
    this.shapes.push(shape);
    this.redrawAll();
    this.saveHistory();
  }

  removeShape(shape) {
    this.shapes = this.shapes.filter(s => s !== shape);
    if (this.selectedShape === shape) this.selectedShape = null;
    this.redrawAll();
    this.saveHistory();
  }

  // --------------- TEXT ----------------
  addTextShape(x, y, text, options = {}) {
    const s = new TextShape(x, y, text, {
      color: options.color || this.drawColor,
      fontSize: options.fontSize || this.fontSize,
      align: options.align || this.textAlign,
      maxWidth: options.maxWidth
    });
    this.addShape(s);
    return s;
  }

  // --------------- CLEAR ----------------
  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    try { while (this.history.undo()) { } } catch { }

    this.shapes = [];
    this.selectedShape = null;
    this.baseImageData = null;
    this.img = null;
    this.saveHistory();
  }

  // --------------- SAVE IMAGE ----------------
  save() {
    this.redrawAll();
    const now = new Date();
    const ts = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;

    const link = document.createElement("a");
    link.download = `edited-image-${ts}.png`;
    link.href = this.canvas.toDataURL("image/png");
    link.click();
  }

  // --------------- OPEN IMAGE ----------------
  openImage(e) {
    this.loader.openImage(e, (loadedImg) => {
      this.img = loadedImg;

      // reset shapes và UI state
      this.shapes = [];
      this.selectedShape = null;

      // lưu base image
      this.baseImageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      this.saveHistory();

      // vẽ lại toàn bộ
      if (this.redrawAll) this.redrawAll();
    });
  }


  enableClipboardPaste() {
    this.loader.enableClipboardPaste();
  }

  async copyToClipboard() {
    try {
      const blob = await new Promise(res => this.canvas.toBlob(res, "image/png"));
      if (!blob) return false;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return true;
    } catch (err) {
      console.error("Copy failed", err);
      return false;
    }
  }

  // --------------- STICKER ----------------
  addSticker(x, y, src, options = {}) {
    const img = new Image();
    img.onload = () => {
      const shape = new StickerShape(x, y, img, options.width || img.width, options.height || img.height);
      this.addShape(shape);
    };
    img.src = src;
  }

  // --------------- REMOVE BACKGROUND ----------------
  initSelfieSegmentation() {
    if (this.segmenter) return;
    if (typeof SelfieSegmentation === "undefined") return;

    this.segmenter = new SelfieSegmentation({
      locateFile: (f) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
    });

    this.segmenter.setOptions({ modelSelection: 1 });

    this.segmenter.onResults((results) => {
      const temp = document.createElement("canvas");
      temp.width = this.canvas.width;
      temp.height = this.canvas.height;
      const tctx = temp.getContext("2d");

      tctx.drawImage(results.segmentationMask, 0, 0, this.canvas.width, this.canvas.height);
      tctx.globalCompositeOperation = "source-in";
      tctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(temp, 0, 0);

      this.baseImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.saveHistory();
    });
  }

  async removeBackground() {
    if (this.removeMode === "grabcut") {
      if (!this.selectionRect) throw new Error("Chọn vùng trước!");

      const rect = {
        x: Math.min(this.selectionRect.x, this.selectionRect.x + this.selectionRect.w),
        y: Math.min(this.selectionRect.y, this.selectionRect.y + this.selectionRect.h),
        width: Math.abs(this.selectionRect.w),
        height: Math.abs(this.selectionRect.h)
      };

      await this.grabCutDemo(rect);

      this.baseImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.selectionRect = null;
      this.saveHistory();

    } else {
      if (!this.segmenter) this.initSelfieSegmentation();
      if (!this.segmenter) throw new Error("SelfieSegmentation không khả dụng!");
      await this.segmenter.send({ image: this.canvas });
    }
  }

  // --------------- GrabCut ----------------
  async grabCutDemo(rect) {
    if (!window.cv) { alert("OpenCV.js chưa load!"); return; }

    let src = cv.imread(this.canvas);

    try {
      let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
      let bgd = new cv.Mat(), fgd = new cv.Mat();

      const rx = Math.max(0, Math.min(rect.x, src.cols - 1));
      const ry = Math.max(0, Math.min(rect.y, src.rows - 1));

      const rectangle = new cv.Rect(rx, ry, rect.width, rect.height);

      cv.grabCut(src, mask, rectangle, bgd, fgd, 5, cv.GC_INIT_WITH_RECT);

      for (let i = 0; i < mask.rows; i++)
        for (let j = 0; j < mask.cols; j++) {
          const v = mask.ucharPtr(i, j)[0];
          mask.ucharPtr(i, j)[0] = (v === cv.GC_FGD || v === cv.GC_PR_FGD) ? 255 : 0;
        }

      let result = new cv.Mat();
      src.copyTo(result, mask);

      let rgba = new cv.Mat();
      cv.cvtColor(result, rgba, cv.COLOR_BGR2RGBA);

      for (let i = 0; i < rgba.rows; i++)
        for (let j = 0; j < rgba.cols; j++)
          if (mask.ucharPtr(i, j)[0] === 0)
            rgba.ucharPtr(i, j)[3] = 0;

      const imgData = new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows);

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.putImageData(imgData, 0, 0);

      src.delete(); mask.delete(); bgd.delete(); fgd.delete();
      result.delete(); rgba.delete();

    } catch (err) {
      try { src.delete(); } catch { }
      console.error("GrabCut error:", err);
      throw err;
    }
  }

  // ---------------- Selection ----------------
  enableSelection() {
    this.canvas.addEventListener("pointerdown", (e) => {
      if (this.removeMode !== "grabcut") return;

      this.isSelecting = true;
      const rect = this.canvas.getBoundingClientRect();
      this.selectionRect = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        w: 0,
        h: 0
      };
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.isSelecting || !this.selectionRect) return;

      const rect = this.canvas.getBoundingClientRect();
      this.selectionRect.w =
        (e.clientX - rect.left) - this.selectionRect.x;
      this.selectionRect.h =
        (e.clientY - rect.top) - this.selectionRect.y;

      this.redrawAll();
      this.drawSelectionRect();
    });

    this.canvas.addEventListener("pointerup", () => {
      this.isSelecting = false;
    });

    this.canvas.addEventListener("pointercancel", () => {
      this.isSelecting = false;
    });
  }

  drawSelectionRect() {
    if (!this.selectionRect) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(
      this.selectionRect.x,
      this.selectionRect.y,
      this.selectionRect.w,
      this.selectionRect.h
    );
    ctx.restore();
  }

  // -------------- Mode change --------------
  setRemoveMode(mode) { this.removeMode = mode; }

}
