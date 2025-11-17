export const CanvasCore = (function () {
  // --- canvas & context ---
  let canvas, ctx;

  // --- state ---
  let shapes = [];
  let selectedShape = null;
  let history = [];
  let historyIndex = -1;
  let baseImageData = null;
  let img = null;

  // --- config ---
  let drawColor = "#000000";
  let lineWidth = 3;
  let fontSize = 20;
  let textAlign = "left";

  // --- init ---
  function init(c) {
    canvas = c;
    ctx = canvas.getContext("2d");
    if (img) {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.width, img.height);
    } else {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        ctx.putImageData(imgData, 0, 0);
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

  function setDrawColor(color) {
    drawColor = color;
  }

  function setLineWidth(width) {
    lineWidth = width;
  }

  function setFontSize(font) {
    fontSize = font;
  }

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
    }
    else if (shape.type === "sticker") {
      return {
        x: shape.x,
        y: shape.y,
        w: shape.width,
        h: shape.height
      };
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
    }else if (shape.type === "sticker") {
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
    }
    else if (shape.type === "sticker") {
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
  }

  // ---------------------- History ----------------------
  function saveHistory() {
    if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
    history.push(canvas.toDataURL());
    historyIndex = history.length - 1;
    if (history.length > 50) { history.shift(); historyIndex--; }
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      const img = new Image();
      img.src = history[historyIndex];
      img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); shapes = []; selectedShape = null; baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); }
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      const img = new Image();
      img.src = history[historyIndex];
      img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); shapes = []; selectedShape = null; baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); }
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

  function redrawWithTransform() {
    ctx.setTransform(scale, 0, 0, scale, originX, originY);
    redrawAll();
  }

  // ----------------- open image --------

  function openImage(e) {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {

      img = new Image();

      img.onload = () => {

        shapes = [];

        selectedShape = null;

        // const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);

        // ctx.clearRect(0, 0, canvas.width, canvas.height);

        // ctx.drawImage(img, 0, 0, img.width * ratio, img.height * ratio);

        // baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // saveHistory();

        canvas.width = img.width;
        canvas.height = img.height;


        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        saveHistory();
        redrawAll();

      };

      img.src = ev.target.result;

    };

    reader.readAsDataURL(file);
  }

  function enableClipboardPaste() {
    document.addEventListener("paste", (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          const imgPaste = new Image();

          imgPaste.onload = () => {

            // update height/width canvas
            if (canvas.width < imgPaste.width || canvas.height < imgPaste.height) {
              canvas.width = Math.max(canvas.width, imgPaste.width);
              canvas.height = Math.max(canvas.height, imgPaste.height);
            } else {
              canvas.width = Math.min(canvas.width, imgPaste.width);
              canvas.height = Math.min(canvas.height, imgPaste.height);
            }

            // draw img
            const x = (canvas.width - imgPaste.width) / 2;
            const y = (canvas.height - imgPaste.height) / 2;
            ctx.drawImage(imgPaste, x, y);

            baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            saveHistory();
            redrawAll();

            URL.revokeObjectURL(imgPaste.src);
          };

          imgPaste.src = URL.createObjectURL(blob);
          break;
        }
      }
    });
  }

  async function copyToClipboard() {

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return false;

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob })
      ]);

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


  return {
    init, getCtx, getShapes, getSelectedShape, setSelectedShape,
    getDrawColor, getLineThickness, getTextSize, getTextAlign, setConfig,
    getShapeBounds, moveShape, drawShape, redrawAll,
    saveHistory, undo, redo, save, addTextShape, clear,
    setDrawColor, setFontSize, setLineWidth,
    getCenter, redrawWithTransform, getDistance, openImage,
    enableClipboardPaste, copyToClipboard, addSticker
  };
})();
