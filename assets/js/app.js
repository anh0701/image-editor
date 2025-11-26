import { CanvasCore } from './functions.js';
import { RectShape } from './shapes/RectShape.js';
import { ArrowShape } from './shapes/ArrowShape.js';
import { PenShape } from './shapes/PenShape.js';
import { TextShape } from './shapes/TextShape.js';
import { StickerShape } from './shapes/StickerShape.js';

const canvas = document.getElementById("canvas");
const fileInput = document.getElementById("fileInput");
const stickerInput = document.getElementById("stickerInput");

const core = new CanvasCore();
core.init(canvas);
core.enableClipboardPaste();


// ---------------------- State ----------------------
let tool = "rect", drawing = false, startX = 0, startY = 0;
let dragging = false, offsetX = 0, offsetY = 0, currentPen = null;
let scale = 1, originX = 0, originY = 0;
let lastTouchDistance = 0, lastCenter = null;

// temp canvas live preview
const tempCanvas = document.createElement("canvas");
const tempCtx = tempCanvas.getContext("2d");
tempCanvas.width = canvas.width;
tempCanvas.height = canvas.height;

// ---------------------- Text Input ----------------------
let textInput = document.createElement("textarea");
textInput.placeholder = "Nhập text... (Shift+Enter xuống dòng, Enter xác nhận)";
Object.assign(textInput.style, { position: "absolute", display: "none", zIndex: 1000 });
document.body.appendChild(textInput);

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const x = parseFloat(textInput.dataset.x);
    const y = parseFloat(textInput.dataset.y);
    const textShape = new TextShape(x, y, textInput.value.trim(), {
      color: core.getDrawColor(),
      fontSize: core.getTextSize(),
      align: core.getTextAlign()
    });
    core.addShape(textShape);
    textInput.style.display = "none";
  } else if (e.key === "Escape") {
    textInput.style.display = "none";
  }
});

// ---------------------- Pointer Events ----------------------
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  startX = x;
  startY = y;
  drawing = true;

  if (tool === "pen") {
    currentPen = new PenShape([{ x, y }], {
      color: core.getDrawColor(),
      lineWidth: core.getLineThickness()
    });
    core.addShape(currentPen);
    core.redrawAll();
    return;
  }

  if (tool === "text") {
    drawing = false;
    textInput.style.left = `${e.clientX}px`;
    textInput.style.top = `${e.clientY}px`;
    textInput.style.display = "block";
    textInput.value = "";
    textInput.style.fontSize = core.getTextSize() + "px";
    textInput.dataset.x = x;
    textInput.dataset.y = y;
    requestAnimationFrame(() => textInput.focus());
    return;
  }

  if (tool === "select") {
    core.setSelectedShape(null);
    const shapes = core.getShapes();
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const b = core.getShapeBounds(s);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        core.setSelectedShape(s);
        offsetX = x - b.x;
        offsetY = y - b.y;
        dragging = true;
        break;
      }
    }
    core.redrawAll();
    return;
  }

  if (tool === "sticker") {
    stickerInput.click();
    drawing = false;
    return;
  }
});

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (tool === "pen" && drawing && currentPen) {
    currentPen.addPoint({ x, y });
    core.redrawAll();
    return;
  }

  if (tool === "select" && dragging) {
    const s = core.getSelectedShape();
    if (!s) return;
    const b = core.getShapeBounds(s);
    const dx = (x - offsetX) - b.x;
    const dy = (y - offsetY) - b.y;
    core.moveShape(s, dx, dy);
    core.redrawAll();
    return;
  }

  if (drawing && (tool === "rect" || tool === "arrow")) {
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    let tempShape;
    if (tool === "rect") tempShape = new RectShape(startX, startY, x, y, {
      color: core.getDrawColor(),
      lineWidth: core.getLineThickness()
    });
    if (tool === "arrow") tempShape = new ArrowShape(startX, startY, x, y, {
      color: core.getDrawColor(),
      lineWidth: core.getLineThickness()
    });
    if (tempShape) core.drawShape(tempCtx, tempShape);

    core.redrawAll();
    core.getCtx().drawImage(tempCanvas, 0, 0);
  }
});

canvas.addEventListener("pointerup", (e) => {
  if (tool === "pen" && drawing) {
    drawing = false;
    if (currentPen && currentPen.points.length >= 2) {
      currentPen = null;
      core.redrawAll();
      core.saveHistory();
    }
    return;
  }

  if (tool === "select" && dragging) {
    dragging = false;
    core.redrawAll();
    core.saveHistory();
    return;
  }

  if (!drawing) return;
  drawing = false;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (tool === "rect") {
    const rectShape = new RectShape(startX, startY, x, y, {
      color: core.getDrawColor(),
      lineWidth: core.getLineThickness()
    });
    core.addShape(rectShape);
  }

  if (tool === "arrow") {
    const arrowShape = new ArrowShape(startX, startY, x, y, {
      color: core.getDrawColor(),
      lineWidth: core.getLineThickness()
    });
    core.addShape(arrowShape);
  }

  core.redrawAll();
  core.saveHistory();
});

// ---------------------- Touch Pinch Zoom ----------------------
canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    lastTouchDistance = core.getDistance(e.touches);
    lastCenter = core.getCenter(e.touches);
  }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const newDistance = core.getDistance(e.touches);
    const newCenter = core.getCenter(e.touches);

    const scaleChange = newDistance / lastTouchDistance;
    scale *= scaleChange;
    scale = Math.min(Math.max(scale, 0.5), 4);

    originX -= (newCenter.x - lastCenter.x) / scale;
    originY -= (newCenter.y - lastCenter.y) / scale;

    lastTouchDistance = newDistance;
    lastCenter = newCenter;

    core.redrawWithTransform();
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) {
    lastTouchDistance = 0;
    lastCenter = null;
  }
});

// ---------------------- File / Sticker ----------------------
fileInput.addEventListener("change", (e) => core.openImage(e));

stickerInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);

  const x = canvas.width / 2;
  const y = canvas.height / 2;
  const maxWidth = canvas.width * 0.3;
  const maxHeight = canvas.height * 0.3;

  const img = new Image();
  img.src = url;
  img.onload = () => {
    const sticker = new StickerShape(x, y, img, maxWidth, maxHeight);
    core.addShape(sticker);
    core.redrawAll();
  };
  stickerInput.value = "";
});

// ---------------------- Toolbar ----------------------
document.getElementById("rectBtn").onclick = () => tool = "rect";
document.getElementById("arrowBtn").onclick = () => tool = "arrow";
document.getElementById("textBtn").onclick = () => tool = "text";
document.getElementById("penBtn").onclick = () => tool = "pen";
document.getElementById("selectBtn").onclick = () => tool = "select";
document.getElementById("undoBtn").onclick = () => core.undo();
document.getElementById("redoBtn").onclick = () => core.redo();
document.getElementById("clearBtn").onclick = () => core.clear();
document.getElementById("saveBtn").onclick = () => core.save();
document.getElementById("openBtn").onclick = () => fileInput.click();
document.getElementById("colorPicker").oninput = (e) => core.setDrawColor(e.target.value);
document.getElementById("lineWidth").oninput = (e) => core.setLineWidth(parseInt(e.target.value));
document.getElementById("fontSize").oninput = (e) => core.setFontSize(parseInt(e.target.value));

document.getElementById("copyBtn").addEventListener("click", async () => {
  const ok = await core.copyToClipboard();
  alert(ok ? "Đã copy vào clipboard!" : "Copy thất bại!");
});

document.getElementById("stickerBtn").onclick = () => {
  tool = "sticker";
  stickerInput.click();
};

document.getElementById("removeBtn").addEventListener("click", async () => {
  try {
    await core.removeBackground();
    alert("✅ Tách nền xong!");
  } catch (err) {
    console.error("Lỗi tách nền: ", err);
    alert("❌ Tách nền thất bại! " + err);
  }
});

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.addEventListener("change", e => {
    core.setRemoveMode(e.target.value);
  });
});

// ---------------------- Mobile Menu ----------------------
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const toolbarItems = document.getElementById("toolbarItems");
mobileMenuBtn.addEventListener("click", () => {
  toolbarItems.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!toolbarItems.contains(e.target) && e.target !== mobileMenuBtn) {
    toolbarItems.classList.remove("show");
  }
});

// ---------------------- Shortcuts ----------------------
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "z") {
    e.preventDefault(); core.undo();
  } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
    e.preventDefault(); core.redo();
  } else if (e.ctrlKey && e.key.toLowerCase() === "s") {
    e.preventDefault(); core.save();
  } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
    e.preventDefault();
    core.copyToClipboard().then(ok => {
      alert(ok ? "Đã copy vào clipboard!" : "Copy thất bại!");
    }).catch(err => {
      console.error("Lỗi khi copy:", err);
    });
  }
});
