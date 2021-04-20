const imageInput = document.getElementById("file");

const {width, height} = window.getComputedStyle(imageInput);

let canvas = document.createElement('canvas');

canvas.width = Number(width.slice(0, -2));
canvas.height = Number(height.slice(0, -2));

let ctx = canvas.getContext('2d');

const newLine = document.getElementById('newLine');
const addNewLine = document.getElementById('addNewLine');

const control = document.getElementById('control');
const inputField = document.getElementById('inputField');

let userImage = null;
const allResolution = [0, 0, canvas.width, canvas.height];

const offsetX = canvas.width / 10;
const offsetY = canvas.height / 10;
const textHeight = 0.15;
const outlineWidth = 3;
const outlineOffset = 5;
const outlineBorders = outlineWidth + outlineOffset;
const fontSize = 48;
const delay = 2000;


const frames = [];

imageInput.addEventListener('change', async function(e) {
    const reader = new FileReader();

    const file = e.target.files[0];

    reader.onload = () => {
        userImage = document.createElement('img');
        userImage.src = reader.result;
        userImage.onload = () => {
            DrawImage(userImage);
            imageInput.replaceWith(canvas);
        }
    }
    reader.readAsDataURL(file);
})

addNewLine.addEventListener('click', SumbitEvent);
newLine.addEventListener('keyup', async function(e) {
    if (e.key == "Enter") {
        await SumbitEvent();
    }
})

async function SumbitEvent() {
    const value = newLine.value;
    if (value.trim().length == 0 || !userImage) return;

    const newItem = GetNewItemList(value);
    newItem.frameId = frames.length;
    frames.push(newItem);
    control.append(newItem);

    newLine.value = "";
    await AddLine(value, ctx);
    newLine.focus();
}

async function RedrawAll(cb = function(){}) {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = Number(width.slice(0, -2));
    newCanvas.height = Number(height.slice(0, -2));

    const newCtx = newCanvas.getContext('2d');
    newCtx.drawImage(userImage, ...allResolution);
    for (let i = 0; i < frames.length; i++) {
        if (frames[i]) {
            await AddLine(frames[i].line, newCtx);
            cb(newCtx);
        }
    }
    return [newCanvas, newCtx];
} 

async function RemoveItem(el) {
    frames[el.parentNode.frameId] = null;
    el.parentNode.remove();
    await UpdateCanvas();
}

function EditItem(el) {
    const val = el.parentNode.querySelector('.lineValue');
    val.setAttribute("contenteditable", "true");
    val.focus();
    val.onblur = async () => {
        val.setAttribute("contenteditable", "false");
        el.parentNode.line = val.innerText;
        await UpdateCanvas()
    }
}

async function UpdateCanvas() {
    const [newCanvas, newCtx] = await RedrawAll();
    canvas.replaceWith(newCanvas);
    canvas = newCanvas;
    ctx = newCtx;
}

function GetNewItemList(value) {
    const item = document.createElement('div');
    item.classList.add('line');
    item.line = value;
    item.innerHTML = `
    <span class="lineValue">${value}</span>
    <span class="lineEdit" onClick="EditItem(this)">✎</span>
    <span class="lineRemove" onClick="RemoveItem(this)">✕</span>`;
    return item;
}

async function AddLine(line, ctx) {
    const imageData = ctx.getImageData(...allResolution);

    const resWidth = imageData.width - offsetX * 2;
    const resHeight = imageData.height - offsetY - canvas.height * textHeight;


    const resized = await resizeImageData(imageData, resWidth, resHeight);

    ctx.fillStyle = "black";
    ctx.fillRect(...allResolution);

    ctx.strokeStyle = "white";
    ctx.lineWidth = outlineWidth;
    ctx.strokeRect(offsetX - outlineOffset, offsetY - outlineOffset, resWidth + 2 * outlineOffset, resHeight + 2 * outlineOffset);

    
    ctx.putImageData(resized, offsetX, offsetY);
    ctx.fillStyle = "White";
    ctx.font = `${fontSize}px Times New Roman`;
    ctx.textAlign = "center";
    const [text, size] = MeasureText(line, 48);
    ctx.font = `${size}px Times New Roman`;
    const computedTextHeight = canvas.height * textHeight;
    for (let i = 0; i < text.length; i++) {
        ctx.fillText(text[i], canvas.width / 2, canvas.height - computedTextHeight / 2 + fontSize / 2 + (i - text.length / 2) * fontSize / 1.2);
    }
}

// works for 1-2 lines
function MeasureText(text, fontSize) {
    ctx.font = `${fontSize} Times New Roman`;
    const metrics = ctx.measureText(text);
    if (metrics.width > canvas.width - 50) {
        fontSize-=8;
        let [topHalf, topSize] = MeasureText(text.slice(0, text.length / 2), fontSize);
        let [botHalf, botSize] = MeasureText(text.slice(text.length / 2, text.length), fontSize);
        return [[...topHalf, ...botHalf], Math.min(topSize, botSize)];
    }
    return [[text], fontSize];
}

function DrawImage(img) {
    const scaleX = canvas.height / img.height;
    const newWidth = img.width * scaleX;
    const offsetX = (canvas.width - newWidth) / 2;
    ctx.drawImage(img, offsetX, 0, canvas.width - offsetX * 2, canvas.height);
    // ctx.drawImage(img, ...allResolution);
}
async function CompileGIF() {
    let encoder = new GIFEncoder();
    encoder.setRepeat(0);
    encoder.setDelay(delay);
    encoder.start();
    await RedrawAll((context) => {
        encoder.addFrame(context);
    })
    encoder.finish();
    encoder.download("default.gif");
}

// https://gist.github.com/mauriciomassaia/b9e7ef6667a622b104c00249f77f8c03
async function resizeImageData (imageData, width, height) {
  const resizeWidth = width >> 0;
  const resizeHeight = height >> 0;
  const ibm = await window.createImageBitmap(imageData, 0, 0, imageData.width, imageData.height, {
    resizeWidth, resizeHeight
  })
  const canvas = document.createElement('canvas')
  canvas.width = resizeWidth
  canvas.height = resizeHeight
  const ctx = canvas.getContext('2d')
  ctx.scale(resizeWidth / imageData.width, resizeHeight / imageData.height)
  ctx.drawImage(ibm, 0, 0)
  return ctx.getImageData(0, 0, resizeWidth, resizeHeight)
}