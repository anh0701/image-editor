// --- element references ---
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");

// --- tool state ---
let tool = "rect"; // rect, arrow, text, pen, select
let drawing = false;
let startX = 0, startY = 0;
let img = null;

// --- settings ---
let drawColor = document.getElementById("colorPicker").value;
let lineThickness = parseInt(document.getElementById("lineWidth").value);
let textSize = parseInt(document.getElementById("fontSize").value);
let textAlign = "left";
document.getElementById("textAlign").oninput = (e) => (textAlign = e.target.value);

// --- history ---
let history = [];
let historyIndex = -1;
let baseImageData = null;

// --- shapes model & selection ---
let shapes = [];
let selectedShape = null;
let dragging = false;
let offsetX = 0, offsetY = 0;

// --- pen temporary ---
let currentPen = null;

// --- temp canvas for live preview ---
let tempCanvas = document.createElement("canvas");
let tempCtx = tempCanvas.getContext("2d");
tempCanvas.width = canvas.width;
tempCanvas.height = canvas.height;

// --- text input area ---
let textInput;
function setupTextInput() {
  textInput = document.createElement("textarea");
  textInput.placeholder = "Nhập text... (Shift+Enter xuống dòng, Enter xác nhận)";
  Object.assign(textInput.style, {
    position: "absolute",
    display: "none",
    zIndex: 1000,
    fontSize: textSize + "px",
    border: "1px solid #333",
    borderRadius: "4px",
    padding: "6px",
    background: "white",
    color: "black",
    minWidth: "80px",
    resize: "none",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  });

  document.body.appendChild(textInput);

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishTextInput();
    } else if (e.key === "Escape") {
      textInput.style.display = "none";
    }
  });
}
setupTextInput();

// ---------------------- Helpers -----------------------
function saveHistory() {
  if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
  history.push(canvas.toDataURL());
  historyIndex = history.length - 1;
  if (history.length > 50) {
    history.shift();
    historyIndex--;
  }
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    const imgData = new Image();
    imgData.src = history[historyIndex];
    imgData.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgData, 0, 0);
      shapes = [];
      selectedShape = null;
      baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    const imgData = new Image();
    imgData.src = history[historyIndex];
    imgData.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgData, 0, 0);
      shapes = [];
      selectedShape = null;
      baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
  }
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
    if (shape.align === "center") x = shape.x - width / 2;
    else if (shape.align === "right") x = shape.x - width;
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
    return { x: minX - shape.lineWidth - 6, y: minY - shape.lineWidth - 6, w: (maxX - minX) + (shape.lineWidth + 12), h: (maxY - minY) + (shape.lineWidth + 12) };
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
    for (let i = 0; i < shape.points.length; i++) {
      const p = shape.points[i];
      if (i === 0) context.moveTo(p.x, p.y);
      else context.lineTo(p.x, p.y);
    }
    context.stroke();
  }
  context.restore();
}

function drawArrow(ctxRef, x1, y1, x2, y2, lineWidth = 1) {
  const headlen = 10 + lineWidth;
  const dx = x2 - x1;
  const dy = y2 - y1;
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
  const lineHeight = (context.font ? parseInt(context.font) : textSize) * 1.4;
  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const testWidth = context.measureText(testLine).width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line.trim(), x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line.trim(), x, y);
    y += lineHeight;
  }
}

function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (img) {
    const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    ctx.drawImage(img, 0, 0, img.width * ratio, img.height * ratio);
  } else if (baseImageData) {
    ctx.putImageData(baseImageData, 0, 0);
  }

  for (const s of shapes) drawShape(ctx, s);

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

// ---------------------- Events --------------------------
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  startX = x; startY = y;
  drawing = true;

  if (tool === "pen") {
    currentPen = { type: "pen", points: [{ x, y }], color: drawColor, lineWidth: lineThickness };
    shapes.push(currentPen);
    redrawAll();
    return;
  }

  if (tool === "text") {
    canvas.releasePointerCapture(e.pointerId);
    const screenX = e.clientX;
    const screenY = e.clientY;
    textInput.style.left = `${screenX}px`;
    textInput.style.top = `${screenY}px`;
    textInput.style.display = "block";
    textInput.value = "";
    textInput.style.fontSize = textSize + "px";
    textInput.dataset.x = x;
    textInput.dataset.y = y;
    requestAnimationFrame(() => textInput.focus());
    drawing = false;
    return;
  }

  if (tool === "select") {
    selectedShape = null;
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      const b = getShapeBounds(s);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        selectedShape = s;
        offsetX = x - b.x;
        offsetY = y - b.y;
        dragging = true;
        break;
      }
    }
    redrawAll();
    return;
  }
});

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (tool === "pen" && drawing && currentPen) {
    currentPen.points.push({ x, y });
    redrawAll();
    return;
  }

  if (tool === "select" && dragging && selectedShape) {
    const b = getShapeBounds(selectedShape);
    const targetX = x - offsetX;
    const targetY = y - offsetY;
    const dx = targetX - b.x;
    const dy = targetY - b.y;
    moveShape(selectedShape, dx, dy);
    redrawAll();
    return;
  }

  if (drawing && (tool === "rect" || tool === "arrow")) {
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawShape(tempCtx, { type: tool, x1: startX, y1: startY, x2: x, y2: y, color: drawColor, lineWidth: lineThickness });
    redrawAll();
    ctx.drawImage(tempCanvas, 0, 0);
  }
});

canvas.addEventListener("pointerup", (e) => {
  if (tool === "pen" && drawing) {
    drawing = false;
    if (currentPen && currentPen.points.length >= 2) {
      currentPen.color = drawColor;
      currentPen.lineWidth = lineThickness;
      currentPen = null;
      redrawAll();
      saveHistory();
    }
    return;
  }

  if (tool === "select" && dragging) {
    dragging = false;
    redrawAll();
    saveHistory();
    return;
  }

  if (!drawing) return;
  drawing = false;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (tool === "rect" || tool === "arrow") {
    shapes.push({ type: tool, x1: startX, y1: startY, x2: x, y2: y, color: drawColor, lineWidth: lineThickness });
    redrawAll();
    saveHistory();
  }
});

function finishTextInput() {
  const val = textInput.value.trim();
  const x = parseFloat(textInput.dataset.x);
  const y = parseFloat(textInput.dataset.y);
  if (!val) {
    textInput.style.display = "none";
    return;
  }
  const shape = { type: "text", x, y, text: val, color: drawColor, fontSize: textSize, align: textAlign };
  shapes.push(shape);
  redrawAll();
  saveHistory();
  textInput.style.display = "none";
}

// ---------------------- Toolbar --------------------------
document.getElementById("rectBtn").onclick = () => (tool = "rect");
document.getElementById("arrowBtn").onclick = () => (tool = "arrow");
document.getElementById("textBtn").onclick = () => (tool = "text");
document.getElementById("penBtn").onclick = () => (tool = "pen");
document.getElementById("selectBtn").onclick = () => (tool = "select");
document.getElementById("undoBtn").onclick = undo;
document.getElementById("redoBtn").onclick = redo;

document.getElementById("clearBtn").onclick = () => {
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
};

document.getElementById("openBtn").onclick = () => fileInput.click();
document.getElementById("colorPicker").oninput = (e) => (drawColor = e.target.value);
document.getElementById("lineWidth").oninput = (e) => (lineThickness = parseInt(e.target.value));
document.getElementById("fontSize").oninput = (e) => (textSize = parseInt(e.target.value));

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    img = new Image();
    img.onload = () => {
      shapes = [];
      selectedShape = null;
      const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.width * ratio, img.height * ratio);
      baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      saveHistory();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById("saveBtn").onclick = () => {
  redrawAll();
  const link = document.createElement("a");
  link.download = "edited-image.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// ---------------------- Shortcuts -----------------------
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "z") {
    e.preventDefault(); undo();
  } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
    e.preventDefault(); redo();
  }
});
