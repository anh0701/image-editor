import { CanvasCore } from './functions.js';

const canvas = document.getElementById("canvas");
const fileInput = document.getElementById("fileInput");
CanvasCore.init(canvas);

let tool = "rect", drawing = false, startX = 0, startY = 0;
let dragging = false, offsetX = 0, offsetY = 0, currentPen = null;

let scale = 1;
let originX = 0;
let originY = 0;
let lastTouchDistance = 0;
let lastCenter = null;

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
    CanvasCore.addTextShape(
      parseFloat(textInput.dataset.x),
      parseFloat(textInput.dataset.y),
      textInput.value.trim(),
      {
        color: CanvasCore.getDrawColor(),
        fontSize: CanvasCore.getTextSize(),
        align: CanvasCore.getTextAlign()
      }
    );
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
  startX = x; startY = y;
  drawing = true;

  if (tool === "pen") {
    currentPen = { type: "pen", points: [{ x, y }], color: CanvasCore.getDrawColor(), lineWidth: CanvasCore.getLineThickness() };
    CanvasCore.getShapes().push(currentPen);
    CanvasCore.redrawAll();
    return;
  }

  if (tool === "text") {
    drawing = false;
    textInput.style.left = `${e.clientX}px`;
    textInput.style.top = `${e.clientY}px`;
    textInput.style.display = "block";
    textInput.value = "";
    textInput.style.fontSize = CanvasCore.getTextSize() + "px";
    textInput.dataset.x = x;
    textInput.dataset.y = y;
    requestAnimationFrame(() => textInput.focus());
    return;
  }

  if (tool === "select") {
    CanvasCore.setSelectedShape(null);
    const shapes = CanvasCore.getShapes();
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const b = CanvasCore.getShapeBounds(s);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        CanvasCore.setSelectedShape(s);
        offsetX = x - b.x; offsetY = y - b.y;
        dragging = true;
        break;
      }
    }
    CanvasCore.redrawAll();
  }
});

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (tool === "pen" && drawing && currentPen) {
    currentPen.points.push({ x, y });
    CanvasCore.redrawAll();
    return;
  }

  if (tool === "select" && dragging) {
    const s = CanvasCore.getSelectedShape();
    if (!s) return;
    const b = CanvasCore.getShapeBounds(s);
    const dx = (x - offsetX) - b.x;
    const dy = (y - offsetY) - b.y;
    CanvasCore.moveShape(s, dx, dy);
    CanvasCore.redrawAll();
    return;
  }

  if (drawing && (tool === "rect" || tool === "arrow")) {
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    CanvasCore.drawShape(tempCtx, { type: tool, x1: startX, y1: startY, x2: x, y2: y, color: CanvasCore.getDrawColor(), lineWidth: CanvasCore.getLineThickness() });
    CanvasCore.redrawAll();
    CanvasCore.getCtx().drawImage(tempCanvas, 0, 0);
  }
});

canvas.addEventListener("pointerup", (e) => {
  if (tool === "pen" && drawing) {
    drawing = false;
    if (currentPen && currentPen.points.length >= 2) {
      currentPen.color = CanvasCore.getDrawColor();
      currentPen.lineWidth = CanvasCore.getLineThickness();
      currentPen = null;
      CanvasCore.redrawAll();
      CanvasCore.saveHistory();
    }
    return;
  }

  if (tool === "select" && dragging) {
    dragging = false;
    CanvasCore.redrawAll();
    CanvasCore.saveHistory();
    return;
  }

  if (!drawing) return;
  drawing = false;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  if (tool === "rect" || tool === "arrow") {
    CanvasCore.getShapes().push({ type: tool, x1: startX, y1: startY, x2: x, y2: y, color: CanvasCore.getDrawColor(), lineWidth: CanvasCore.getLineThickness() });
    CanvasCore.redrawAll();
    CanvasCore.saveHistory();
  }
});

// ---------------------- Pinch Zoom Support ----------------------

canvas.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    lastTouchDistance = CanvasCore.getDistance(e.touches);
    lastCenter = CanvasCore.getCenter(e.touches);
  }
}, { passive: false });


canvas.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const newDistance = CanvasCore.getDistance(e.touches);
    const newCenter = CanvasCore.getCenter(e.touches);

    const scaleChange = newDistance / lastTouchDistance;
    scale *= scaleChange;

    scale = Math.min(Math.max(scale, 0.5), 4);

    originX -= (newCenter.x - lastCenter.x) / scale;
    originY -= (newCenter.y - lastCenter.y) / scale;

    lastTouchDistance = newDistance;
    lastCenter = newCenter;

    CanvasCore.redrawWithTransform();
  }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) {
    lastTouchDistance = 0;
    lastCenter = null;
  }
});

fileInput.addEventListener("change", (e) => CanvasCore.openImage(e));


// ---------------------- Toolbar ----------------------
document.getElementById("rectBtn").onclick = () => tool = "rect";
document.getElementById("arrowBtn").onclick = () => tool = "arrow";
document.getElementById("textBtn").onclick = () => tool = "text";
document.getElementById("penBtn").onclick = () => tool = "pen";
document.getElementById("selectBtn").onclick = () => tool = "select";
document.getElementById("undoBtn").onclick = () => CanvasCore.undo();
document.getElementById("redoBtn").onclick = () => CanvasCore.redo();
document.getElementById("clearBtn").onclick = () => CanvasCore.clear();
document.getElementById("saveBtn").onclick = () => CanvasCore.save();
document.getElementById("openBtn").onclick = () => fileInput.click();
document.getElementById("colorPicker").oninput = (e) => CanvasCore.setDrawColor(e.target.value);
document.getElementById("lineWidth").oninput = (e) => CanvasCore.setLineWidth(parseInt(e.target.value));
document.getElementById("fontSize").oninput = (e) => CanvasCore.setFontSize(parseInt(e.target.value));


//--------------------------- menu -------------------------
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
