const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");

// Tool state
let tool = "rect";
let drawing = false;
let startX = 0, startY = 0;
let img = null;

// Settings
let drawColor = document.getElementById("colorPicker").value;
let lineThickness = parseInt(document.getElementById("lineWidth").value);
let textSize = parseInt(document.getElementById("fontSize").value);
let textAlign = "left";
document.getElementById("textAlign").oninput = (e) => (textAlign = e.target.value);

// History
let history = [];
let historyIndex = -1;
let baseImageData = null;

// Temporary canvas for live preview
let tempCanvas = document.createElement("canvas");
let tempCtx = tempCanvas.getContext("2d");
tempCanvas.width = canvas.width;
tempCanvas.height = canvas.height;

saveHistory();
baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

let textInput;

// ---------------------- Text Input -----------------------
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

// ---------------------- Draw Text -----------------------
function drawMultilineText(ctx, text, x, y, maxWidth) {
  const paragraphs = text.split("\n");
  const lineHeight = textSize * 1.4;
  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
    y += lineHeight;
  }
}

function finishTextInput() {
  const val = textInput.value.trim();
  const x = parseFloat(textInput.dataset.x);
  const y = parseFloat(textInput.dataset.y);

  if (!val) {
    textInput.style.display = "none";
    return;
  }

  ctx.save();
  ctx.font = `${textSize}px sans-serif`;
  ctx.fillStyle = drawColor;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "top";

  let maxWidthCanvas;
  if (textAlign === "left") {
    maxWidthCanvas = canvas.width - x;
  } else if (textAlign === "right") {
    maxWidthCanvas = x;
  } else {
    maxWidthCanvas = Math.min(x, canvas.width - x) * 2;
  }
  if (maxWidthCanvas < 50) maxWidthCanvas = canvas.width;

  drawMultilineText(ctx, val, x, y, maxWidthCanvas);
  ctx.restore();

  baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  saveHistory();
  textInput.style.display = "none";
}

// ---------------------- History --------------------------
function saveHistory() {
  if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1);
  history.push(canvas.toDataURL());
  historyIndex = history.length - 1;
  if (history.length > 50) history.shift();
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    const imgData = new Image();
    imgData.src = history[historyIndex];
    imgData.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgData, 0, 0);
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
      baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
  }
}

// ---------------------- Drawing --------------------------
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  startX = (e.clientX - rect.left) * (canvas.width / rect.width);
  startY = (e.clientY - rect.top) * (canvas.height / rect.height);
  drawing = true;

  if (tool === "pen") {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
  } else if (tool === "text") {
    canvas.releasePointerCapture(e.pointerId);

    const screenX = e.clientX;
    const screenY = e.clientY;
    textInput.style.left = `${screenX}px`;
    textInput.style.top = `${screenY}px`;
    textInput.style.display = "block";
    textInput.value = "";
    textInput.style.fontSize = textSize + "px";
    textInput.dataset.x = startX;
    textInput.dataset.y = startY;

    let maxWidthCanvas;
    if (textAlign === "left") maxWidthCanvas = canvas.width - startX;
    else if (textAlign === "right") maxWidthCanvas = startX;
    else maxWidthCanvas = Math.min(startX, canvas.width - startX) * 2;
    if (maxWidthCanvas < 50) maxWidthCanvas = canvas.width;

    const scale = rect.width / canvas.width;
    textInput.style.width = Math.max(100, maxWidthCanvas * scale) + "px";

    requestAnimationFrame(() => textInput.focus());
    drawing = false;
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!drawing || tool === "text") return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (tool === "pen") {
    ctx.lineTo(x, y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = lineThickness;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    return;
  }

  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  drawShape(tempCtx, startX, startY, x, y);

  if (baseImageData) ctx.putImageData(baseImageData, 0, 0);
  else if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(tempCanvas, 0, 0);
});

canvas.addEventListener("pointerup", (e) => {
  if (!drawing || tool === "text") return;
  drawing = false;

  if (tool === "pen") {
    ctx.closePath();
    baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    saveHistory();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  drawShape(ctx, startX, startY, x, y);
  baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  saveHistory();
});

function drawShape(context, x1, y1, x2, y2) {
  context.save();
  context.lineWidth = lineThickness;
  context.strokeStyle = drawColor;
  context.fillStyle = drawColor;
  if (tool === "rect") context.strokeRect(x1, y1, x2 - x1, y2 - y1);
  else if (tool === "arrow") drawArrow(context, x1, y1, x2, y2);
  context.restore();
}

function drawArrow(ctx, x1, y1, x2, y2) {
  const headlen = 10 + lineThickness;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

// ---------------------- Toolbar --------------------------
document.getElementById("rectBtn").onclick = () => (tool = "rect");
document.getElementById("arrowBtn").onclick = () => (tool = "arrow");
document.getElementById("textBtn").onclick = () => (tool = "text");
document.getElementById("penBtn").onclick = () => (tool = "pen");
document.getElementById("undoBtn").onclick = undo;
document.getElementById("redoBtn").onclick = redo;

document.getElementById("clearBtn").onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  history = [];
  historyIndex = -1;
  baseImageData = null;
  if (img) {
    const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    ctx.drawImage(img, 0, 0, img.width * ratio, img.height * ratio);
    baseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    saveHistory();
  } else {
    saveHistory();
  }
};

document.getElementById("openBtn").onclick = () => fileInput.click();
document.getElementById("colorPicker").oninput = (e) => (drawColor = e.target.value);
document.getElementById("lineWidth").oninput = (e) => (lineThickness = parseInt(e.target.value));
document.getElementById("fontSize").oninput = (e) => (textSize = parseInt(e.target.value));

// ---------------------- Open Image -----------------------
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    img = new Image();
    img.onload = () => {
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

// ---------------------- Save Image -----------------------
document.getElementById("saveBtn").onclick = () => {
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
  } else if (e.ctrlKey && e.key.toLowerCase() === "s") {
    e.preventDefault();
    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
});
