import {HistoryManager} from "./HistoryManager.js";
import ImageLoader from "./ImageLoader.js";

export const CanvasCore = (function () {
  // --- canvas & context ---
  let canvas, ctx;

  // --- state ---
  let shapes = [];
  let selectedShape = null;
  // let history = [];
  // let historyIndex = -1;
  let baseImageData = null;
  let img = null;

  // --- config ---
  let drawColor = "#000000";
  let lineWidth = 3;
  let fontSize = 16;
  let textAlign = "left";

  // --- selection / remove bg ---
  let selectionRect = null;
  let isSelecting = false;
  let removeMode = "selfie"; // "grabcut" hoặc "selfie"
  let segmenter = null;

  const history = new HistoryManager();
  let loader;

  // --- init ---
  function init(c) {
    canvas = c;
    ctx = canvas.getContext("2d");
    loader = new ImageLoader(canvas);
    // sync base canvas size -> keep whatever canvas already has or set from img
    if (img) {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.width, img.height);
    } else {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          // ignore if canvas was empty
          canvas.width = displayWidth;
          canvas.height = displayHeight;
        }
      }
    }
    baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    saveHistory();
  }

  // ---------------------- Shape & Drawing ----------------------
  function getShapes() { return shapes; }
  function getSelectedShape() { return selectedShape; }
  function setSelectedShape(s) { selectedShape = s; }
  function getCtx() { return ctx; }

  function getDrawColor() { return drawColor; }
  function getLineThickness() { return lineWidth; }
  function getTextSize() { return fontSize; }
  function getTextAlign() { return textAlign; }

  function setDrawColor(color) { drawColor = color; }
  function setLineWidth(width) { lineWidth = width; }
  function setFontSize(font) { fontSize = font; }

  function setConfig(conf) {
    if (conf.color !== undefined) drawColor = conf.color;
    if (conf.lineWidth !== undefined) lineWidth = conf.lineWidth;
    if (conf.fontSize !== undefined) fontSize = conf.fontSize;
    if (conf.textAlign !== undefined) textAlign = conf.textAlign;
  }

  function getShapeBounds(shape) {
    if (!shape) return { x: 0, y: 0, w: 0, h: 0 };
    if (shape.type === "rect" || shape.type === "arrow") {
      const x = Math.min(shape.x1, shape.x2);
      const y = Math.min(shape.y1, shape.y2);
      const w = Math.abs(shape.x2 - shape.x1);
      const h = Math.abs(shape.y2 - shape.y1);
      return { x: x - 6, y: y - 6, w: w + 12, h: h + 12 };
    } else if (shape.type === "text") {
      ctx.save();
      ctx.font = `${shape.fontSize}px sans-serif`;
      const width = ctx.measureText(shape.text).width;
      ctx.restore();
      let x = shape.x;
      if (shape.align === "center") x -= width / 2;
      else if (shape.align === "right") x -= width;
      const h = shape.fontSize * 1.4;
      return { x: x - 6, y: shape.y - 6, w: width + 12, h: h + 12 };
    } else if (shape.type === "pen") {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of shape.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      if (minX === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
      return {
        x: minX - shape.lineWidth - 6, y: minY - shape.lineWidth - 6,
        w: (maxX - minX) + shape.lineWidth + 12, h: (maxY - minY) + shape.lineWidth + 12
      };
    } else if (shape.type === "sticker") {
      return { x: shape.x, y: shape.y, w: shape.width, h: shape.height };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function moveShape(shape, dx, dy) {
    if (!shape) return;
    if (shape.type === "rect" || shape.type === "arrow") {
      shape.x1 += dx; shape.y1 += dy;
      shape.x2 += dx; shape.y2 += dy;
    } else if (shape.type === "text") {
      shape.x += dx; shape.y += dy;
    } else if (shape.type === "pen") {
      shape.points.forEach(p => { p.x += dx; p.y += dy; });
    } else if (shape.type === "sticker") {
      shape.x += dx; shape.y += dy;
    }
  }

  function drawShape(context, shape) {
    context.save();
    context.lineWidth = shape.lineWidth || 1;
    context.strokeStyle = shape.color || "#000";
    context.fillStyle = shape.color || "#000";

    if (shape.type === "rect") {
      context.strokeRect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
    } else if (shape.type === "arrow") {
      drawArrow(context, shape.x1, shape.y1, shape.x2, shape.y2, shape.lineWidth || 1);
    } else if (shape.type === "text") {
      context.font = `${shape.fontSize}px sans-serif`;
      context.textAlign = shape.align || "left";
      context.textBaseline = "top";
      drawMultilineText(context, shape.text, shape.x, shape.y, shape.maxWidth || canvas.width);
    } else if (shape.type === "pen") {
      if (!shape.points || shape.points.length === 0) { context.restore(); return; }
      context.beginPath();
      context.lineCap = "round";
      context.lineJoin = "round";
      shape.points.forEach((p, i) => i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y));
      context.stroke();
    } else if (shape.type === "sticker") {
      context.drawImage(shape.img, shape.x, shape.y, shape.width, shape.height);
    }

    context.restore();
  }

  function drawArrow(ctxRef, x1, y1, x2, y2, lineWidth = 1) {
    const headlen = 10 + lineWidth;
    const dx = x2 - x1, dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    ctxRef.beginPath();
    ctxRef.moveTo(x1, y1);
    ctxRef.lineTo(x2, y2);
    ctxRef.stroke();
    ctxRef.beginPath();
    ctxRef.moveTo(x2, y2);
    ctxRef.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctxRef.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctxRef.closePath();
    ctxRef.fill();
  }

  function drawMultilineText(context, text, x, y, maxWidth) {
    const paragraphs = text.split("\n");
    const lineHeight = (parseInt(context.font) || fontSize) * 1.4;
    paragraphs.forEach(p => {
      const words = p.split(" ");
      let line = "";
      words.forEach((w, n) => {
        const testLine = line + w + " ";
        const testWidth = context.measureText(testLine).width;
        if (testWidth > maxWidth && n > 0) {
          context.fillText(line.trim(), x, y);
          line = w + " ";
          y += lineHeight;
        } else line = testLine;
      });
      context.fillText(line.trim(), x, y);
      y += lineHeight;
    });
  }

  function redrawAll() {
    // draw base image then shapes (no transform)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (baseImageData) ctx.putImageData(baseImageData, 0, 0);
    shapes.forEach(s => drawShape(ctx, s));
    if (selectedShape) {
      const b = getShapeBounds(selectedShape);
      ctx.save();
      ctx.strokeStyle = "rgba(0,120,255,0.9)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }
    // draw selectionRect overlay if any (for GrabCut selection)
    if (selectionRect && (removeMode === "grabcut")) {
      drawSelectionRect();
    }
  }

  // ---------------------- History ----------------------
  function saveHistory() {
    const clonedShapes = shapes.map(s => JSON.parse(JSON.stringify(s)));
  history.push(clonedShapes);
  }

  function undo() {
    const state = history.undo();
    if (state) {
      shapes = state;
      redrawAll();
    }
  }

  function redo() {
    const state = history.redo();
    if (state) {
      shapes = state;
      redrawAll();
    }
  }

  // ---------------------- Add Text ----------------------
  function addTextShape(x, y, text, options = {}) {
    shapes.push({
      type: "text",
      x, y,
      text,
      color: options.color || drawColor,
      fontSize: options.fontSize || fontSize,
      align: options.align || textAlign
    });
    redrawAll();
    saveHistory();
  }

  // ------------ clear ------------
  function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history = [];
    historyIndex = -1;
    baseImageData = null;
    shapes = [];
    selectedShape = null;
    if (img) {
      const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
      ctx.drawImage(img, 0, 0, img.width * ratio, img.height * ratio);
      baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      saveHistory();
    } else saveHistory();
  }

  // ------------ save image --------------
  function save() {
    redrawAll();
    const now = new Date();
    const timestamp = now.getFullYear()
      + "-" + String(now.getMonth() + 1).padStart(2, "0")
      + "-" + String(now.getDate()).padStart(2, "0")
      + "_" + String(now.getHours()).padStart(2, "0")
      + "-" + String(now.getMinutes()).padStart(2, "0")
      + "-" + String(now.getSeconds()).padStart(2, "0");
    const link = document.createElement("a");
    link.download = `edited-image-${timestamp}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  // redraw with transform — safe fallback if global scale/originX not present
  function redrawWithTransform() {
    // try to use variables if they exist (main script might define scale/originX/originY)
    const s = (typeof scale !== "undefined") ? scale : (canvas && canvas._scale ? canvas._scale : 1);
    const ox = (typeof originX !== "undefined") ? originX : (canvas && canvas._originX ? canvas._originX : 0);
    const oy = (typeof originY !== "undefined") ? originY : (canvas && canvas._originY ? canvas._originY : 0);
    ctx.setTransform(s, 0, 0, s, ox, oy);
    // draw base + shapes under this transform
    // NOTE: baseImageData is drawn with putImageData which ignores transform; so instead draw image
    if (img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.width, img.height);
      shapes.forEach(s => drawShape(ctx, s));
    } else {
      redrawAll();
    }
  }

  // ----------------- open image --------
  function openImage(e) {
    loader.openImage(e, (loadedImg) => {
    img = loadedImg; // cập nhật img trong CanvasCore
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    shapes = []; // xóa shapes cũ nếu muốn
    saveHistory();
  });
  }

  function enableClipboardPaste() {
    loader.enableClipboardPaste();
  }

  async function copyToClipboard() {
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return false;
      await navigator.clipboard.write([ new ClipboardItem({ "image/png": blob }) ]);
      console.log("✅ Canvas copied to clipboard!");
      return true;
    } catch (err) {
      console.error("❌ Copy failed:", err);
      return false;
    }
  }

  function addSticker(x, y, src, options = {}) {
    const stickerImg = new Image();
    stickerImg.onload = () => {
      const shape = {
        type: "sticker",
        x, y,
        img: stickerImg,
        width: options.width || stickerImg.width,
        height: options.height || stickerImg.height
      };
      shapes.push(shape);
      redrawAll();
      saveHistory();
    };
    stickerImg.src = src;
  }

  // ---------------------- Remove Background ----------------------
  function initSelfieSegmentation() {
    if (segmenter) return;
    if (typeof SelfieSegmentation === "undefined") {
      console.warn("SelfieSegmentation not available.");
      return;
    }
    segmenter = new SelfieSegmentation({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
    segmenter.setOptions({ modelSelection: 1 });
    segmenter.onResults((results) => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tctx = tempCanvas.getContext("2d");
      tctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      tctx.globalCompositeOperation = "source-in";
      tctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      saveHistory();
    });
  }

  async function removeBackground() {
    if (removeMode === "grabcut") {
      if (!selectionRect) {
        throw new Error('Chọn vùng trước khi GrabCut');
      }
      // normalize selectionRect -> rect with positive width/height
      const rx = Math.min(selectionRect.x, selectionRect.x + selectionRect.w);
      const ry = Math.min(selectionRect.y, selectionRect.y + selectionRect.h);
      const rwidth = Math.abs(selectionRect.w);
      const rheight = Math.abs(selectionRect.h);
      const rect = { x: Math.max(0, Math.floor(rx)), y: Math.max(0, Math.floor(ry)), width: Math.max(1, Math.floor(rwidth)), height: Math.max(1, Math.floor(rheight)) };
      await grabCutDemo(rect);
      // after grabCutDemo we already updated canvas; update baseImageData and history
      baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      saveHistory();
      selectionRect = null;
      // don't call redrawAll() here because grabCutDemo already wrote result to canvas
    } else if (removeMode === "selfie") {
      if (!segmenter) initSelfieSegmentation();
      if (!segmenter) throw new Error("Selfie segmentation không khả dụng.");
      await segmenter.send({ image: canvas });
    }
  }

  // ---------------------- GrabCut ----------------------
  async function grabCutDemo(rect) {
    if (!window.cv) {
      alert("OpenCV.js chưa load!");
      return;
    }
    // read canvas into src mat
    let src = cv.imread(canvas); // BGR Mat
    try {
      let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
      let bgd = new cv.Mat();
      let fgd = new cv.Mat();
      // ensure rect inside bounds
      const rx = Math.max(0, Math.min(rect.x, src.cols - 1));
      const ry = Math.max(0, Math.min(rect.y, src.rows - 1));
      const rw = Math.max(1, Math.min(rect.width, src.cols - rx));
      const rh = Math.max(1, Math.min(rect.height, src.rows - ry));
      let rectangle = new cv.Rect(rx, ry, rw, rh);
      cv.grabCut(src, mask, rectangle, bgd, fgd, 5, cv.GC_INIT_WITH_RECT);
      // convert mask to binary 0/255 for foreground
      for (let i = 0; i < mask.rows; i++) {
        for (let j = 0; j < mask.cols; j++) {
          const v = mask.ucharPtr(i, j)[0];
          mask.ucharPtr(i, j)[0] = (v === cv.GC_FGD || v === cv.GC_PR_FGD) ? 255 : 0;
        }
      }
      // create result mat where background becomes transparent
      let result = new cv.Mat();
      src.copyTo(result, mask); // BGR result (background black where mask=0)
      // convert to RGBA
      let rgba = new cv.Mat();
      cv.cvtColor(result, rgba, cv.COLOR_BGR2RGBA);
      // set alpha to 0 where mask == 0
      for (let i = 0; i < rgba.rows; i++) {
        for (let j = 0; j < rgba.cols; j++) {
          if (mask.ucharPtr(i, j)[0] === 0) {
            rgba.ucharPtr(i, j)[3] = 0; // transparent
          }
        }
      }
      // show RGBA on canvas — need to put ImageData
      const imgData = new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows);
      // clear canvas and draw
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imgData, 0, 0);

      // cleanup
      src.delete();
      mask.delete();
      bgd.delete();
      fgd.delete();
      result.delete();
      rgba.delete();
      return;
    } catch (err) {
      // cleanup on error
      try { src.delete(); } catch (e) {}
      console.error("GrabCut error:", err);
      throw err;
    }
  }

  // ---------------------- Selection ----------------------
  function enableSelection() {
    // use pointer events for better compatibility (touch + mouse)
    canvas.addEventListener("pointerdown", (e) => {
      if (removeMode !== "grabcut") return;
      isSelecting = true;
      const rect = canvas.getBoundingClientRect();
      selectionRect = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        w: 0, h: 0
      };
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!isSelecting || !selectionRect) return;
      const rect = canvas.getBoundingClientRect();
      selectionRect.w = (e.clientX - rect.left) - selectionRect.x;
      selectionRect.h = (e.clientY - rect.top) - selectionRect.y;
      redrawAll();
      drawSelectionRect();
    });
    canvas.addEventListener("pointerup", () => { isSelecting = false; });
    canvas.addEventListener("pointercancel", () => { isSelecting = false; });
  }

  function drawSelectionRect() {
    if (!selectionRect) return;
    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.restore();
  }

  // ---------- Mode change ----------
  function setRemoveMode(mode) { removeMode = mode; }

  return {
    init, getCtx, getShapes, getSelectedShape, setSelectedShape,
    getDrawColor, getLineThickness, getTextSize, getTextAlign, setConfig,
    getShapeBounds, moveShape, drawShape, redrawAll,
    saveHistory, undo, redo, save, addTextShape, clear,
    setDrawColor, setFontSize, setLineWidth,
    getCenter, redrawWithTransform, getDistance, openImage,
    enableClipboardPaste, copyToClipboard, addSticker,
    enableSelection, removeBackground, setRemoveMode
  };
})();
