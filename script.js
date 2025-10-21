const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('fileInput');
const colorPicker = document.getElementById('colorPicker');
const lineWidthInput = document.getElementById('lineWidthInput');

let tool = 'draw';
let color = colorPicker.value;
let lineWidth = parseInt(lineWidthInput.value,10);
let fontSize = 20; // default font size for text

let bgImage = null;
let drawing = false;
let startX = 0, startY = 0;
let previewRect = null;
let history = [];
let historyIndex = -1;
let snapshot = null;
let texts = [];
let textInput = null;

// --- Tool & color ---
function setTool(t){ tool = t; }
colorPicker.onchange = e => color = e.target.value;
lineWidthInput.onchange = e => lineWidth = parseInt(e.target.value,10);

// --- Load image ---
fileInput.onchange = e=>{
  const f = e.target.files[0];
  if(!f) return;
  const img = new Image();
  img.onload = ()=>{
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0);
    bgImage = img;
    history = [];
    texts = [];
    pushHistory();
  };
  img.src = URL.createObjectURL(f);
};

// --- Pointer position with scaling ---
function getPointerPos(e){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
  const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
  return { 
    x: Math.round((clientX - rect.left) * scaleX), 
    y: Math.round((clientY - rect.top) * scaleY) 
  };
}

// --- Pointer events ---
canvas.addEventListener('pointerdown', e=>{
  if(!bgImage) return;
  const p = getPointerPos(e);
  startX = p.x; startY = p.y;

  if(tool==='draw'){
    drawing=true;
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap='round';
    ctx.lineJoin='round';
  } else if(['rect','arrow','blur'].includes(tool)){
    drawing=true;
    previewRect = {x:startX, y:startY, w:0, h:0};
    snapshot = ctx.getImageData(0,0,canvas.width,canvas.height);
  } else if(tool==='text'){
    openTextInputAt(p.x,p.y);
  }
});

canvas.addEventListener('pointermove', e=>{
  if(!bgImage || !drawing) return;
  const p = getPointerPos(e);

  if(tool==='draw'){
    ctx.lineTo(p.x,p.y); ctx.stroke();
  } else if(previewRect){
    previewRect.w = p.x - previewRect.x;
    previewRect.h = p.y - previewRect.y;
    ctx.putImageData(snapshot,0,0);
    drawPreview(tool, previewRect);
  }
});

canvas.addEventListener('pointerup', e=>{
  if(!bgImage || !drawing) return;
  const p = getPointerPos(e);

  if(tool==='draw'){
    drawing=false; pushHistory();
  } else if(previewRect){
    previewRect.w = p.x - previewRect.x;
    previewRect.h = p.y - previewRect.y;
    applyShape(tool, previewRect);
    previewRect=null;
    drawing=false;
    pushHistory();
  }
});

// --- Draw preview ---
function drawPreview(toolName, rect){
  if(!rect) return;
  ctx.save();
  ctx.setLineDash([6,4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  drawShape(ctx, toolName, rect);
  ctx.restore();
}

// --- Draw shape ---
function drawShape(ctxObj, toolName, rect){
  const {x,y,w,h} = rect;
  switch(toolName){
    case 'rect': ctxObj.strokeRect(x,y,w,h); break;
    case 'arrow': drawArrow(ctxObj,x,y,x+w,y+h); break;
    case 'blur': ctxObj.strokeRect(x,y,w,h); break;
  }
}

// --- Apply shape ---
function applyShape(toolName, rect){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if(toolName==='blur'){ applyBlurRect(rect); }
  else if(toolName==='rect' || toolName==='arrow'){ drawShape(ctx,toolName,rect); }
  ctx.restore();
}

// --- Arrow ---
function drawArrow(context, fromX, fromY, toX, toY){
  const headlen=15;
  const angle=Math.atan2(toY-fromY,toX-fromX);
  context.beginPath();
  context.moveTo(fromX,fromY);
  context.lineTo(toX,toY);
  context.stroke();
  context.beginPath();
  context.moveTo(toX,toY);
  context.lineTo(toX-headlen*Math.cos(angle-Math.PI/6), toY-headlen*Math.sin(angle-Math.PI/6));
  context.moveTo(toX,toY);
  context.lineTo(toX-headlen*Math.cos(angle+Math.PI/6), toY-headlen*Math.sin(angle+Math.PI/6));
  context.stroke();
}

// --- Blur ---
function applyBlurRect(rect){
  const x=Math.min(rect.x,rect.x+rect.w)|0;
  const y=Math.min(rect.y,rect.y+rect.h)|0;
  const w=Math.abs(rect.w)|0;
  const h=Math.abs(rect.h)|0;
  if(w<=0||h<=0)return;
  const tmp=document.createElement('canvas'); tmp.width=w; tmp.height=h;
  const tctx=tmp.getContext('2d'); tctx.drawImage(canvas,x,y,w,h,0,0,w,h);
  const blurred=document.createElement('canvas'); blurred.width=w; blurred.height=h;
  const bctx=blurred.getContext('2d'); bctx.filter='blur(8px)'; bctx.drawImage(tmp,0,0);
  ctx.drawImage(blurred,x,y);
}

// --- Text ---
textInput = document.createElement('input');
textInput.type='text';
textInput.style.position='absolute';
textInput.style.display='none';
document.body.appendChild(textInput);

function openTextInputAt(x,y){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  textInput.style.left = (rect.left + x/scaleX)+'px';
  textInput.style.top = (rect.top + y/scaleY)+'px';
  textInput.style.position = 'absolute';
  textInput.style.display = 'block';
  textInput.style.zIndex = 1000;
  textInput.style.border = '1px solid #333';
  textInput.style.padding = '2px 4px';
  textInput.value='';
  textInput.focus();

  function commit(){
    const txt=textInput.value.trim();
    if(txt){
      texts.push({x,y,text:txt,color,size:fontSize});
      pushHistory();
      renderTexts();
    }
    textInput.style.display='none';
    textInput.removeEventListener('keydown',onKey);
    document.removeEventListener('pointerdown',onClickOutside);
  }

  function onKey(e){ if(e.key==='Enter'){commit();} if(e.key==='Escape'){textInput.style.display='none';} }
  function onClickOutside(e){ if(e.target!==textInput) commit(); }

  textInput.addEventListener('keydown',onKey);
  document.addEventListener('pointerdown',onClickOutside);
}

// --- Render texts ---
function renderTexts(){
  ctx.save();
  for(const t of texts){
    ctx.font = t.size+'px sans-serif';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text,t.x,t.y);
  }
  ctx.restore();
}

// --- History ---
function pushHistory(){
  if(historyIndex<history.length-1) history = history.slice(0,historyIndex+1);

  const snap = canvas.toDataURL('image/png');
  const txts = JSON.parse(JSON.stringify(texts));
  history.push({image:snap,texts:txts});
  historyIndex=history.length-1;
}

function undo(){
  if(historyIndex<=0) return;
  historyIndex--; restoreHistory(historyIndex);
}
function redo(){
  if(historyIndex>=history.length-1) return;
  historyIndex++; restoreHistory(historyIndex);
}

function restoreHistory(idx){
  const entry = history[idx];
  if(!entry) return;
  const img = new Image();
  img.onload = ()=>{
    canvas.width=img.width;
    canvas.height=img.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0);
    texts = JSON.parse(JSON.stringify(entry.texts));
    renderTexts();
  };
  img.src = entry.image;
}

// --- Save image ---
function saveImage(){
  const out=document.createElement('canvas'); out.width=canvas.width; out.height=canvas.height;
  const octx = out.getContext('2d');
  octx.drawImage(canvas,0,0);
  for(const t of texts){
    octx.font = t.size+'px sans-serif';
    octx.fillStyle = t.color;
    octx.fillText(t.text,t.x,t.y);
  }
  const url = out.toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='edited.png'; a.click();
}

// --- Keyboard shortcuts ---
window.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.key==='z'){ undo(); e.preventDefault(); }
  if(e.ctrlKey && e.key==='y'){ redo(); e.preventDefault(); }
});
