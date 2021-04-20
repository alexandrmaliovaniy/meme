const view = document.getElementById("view");

const {width, height} = window.getComputedStyle(view);

let canvas = document.createElement('canvas');

const newLine = document.getElementById('newLine');
const addNewLine = document.getElementById('addNewLine');

const list = document.getElementById('list');
const inputField = document.getElementById('inputField');

let currentPicture = null;

class Picture {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = Number(width.slice(0, -2));
        this.canvas.height = Number(height.slice(0, -2));
        this.ctx = this.canvas.getContext('2d');
        this.frames = [];
        this.img = null;
        this.props = {
            offsetX: this.canvas.width / 10,
            offsetY: this.canvas.height / 10,
            textHeight: 0.15,
            outlineWidth: 3,
            outlineOffset: 5,
            fontSize: 48,
            delay: 2000,
        }
        this.props.outlineBorders = this.props.outlineWidth + this.props.outlineOffset;
    }
    Display() {
        currentPicture = this;

        const view = document.getElementById('view');
        view.innerHTML = "";

        if (this.img) {
            view.appendChild(this.canvas);
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.id = 'file';
            input.addEventListener('change', (e) => {
                const reader = new FileReader();
                const file = e.target.files[0];
                reader.onload = () => {
                    this.img = document.createElement('img');
                    this.img.src = reader.result;
                    this.img.onload = () => {
                        this.DrawImage(this.img);
                        input.replaceWith(this.canvas);
                    }
                }
                reader.readAsDataURL(file);
            });
            view.appendChild(input);
        }
        document.querySelector("#render > button").onclick = () => this.CompileGIF();
        list.innerHTML = "";

        for (let i = 0; i < this.frames.length; i++) {
            list.appendChild(this.frames[i]);
        }
    }
    DrawImage(img) {
        const scaleX = this.canvas.height / img.height;
        const newWidth = img.width * scaleX;
        const offsetX = (this.canvas.width - newWidth) / 2;
        this.ctx.drawImage(img, offsetX, 0, this.canvas.width - offsetX * 2, this.canvas.height);
    }
    async UpdateCanvas(cb = function() {}) {
        const newCanvas = document.createElement('canvas');
        newCanvas.width = this.canvas.width;
        newCanvas.height = this.canvas.height;
        const newCtx = newCanvas.getContext('2d');
        const oldCanv = this.canvas;
        this.canvas = newCanvas;
        this.ctx = newCtx;
        this.DrawImage(this.img);
        for (let i = 0; i < this.frames.length; i++) {
            if (this.frames[i]) {
                await this.AddLine(this.frames[i].line);
                cb(newCtx);
            }
        }
        oldCanv.replaceWith(this.canvas);
    }
    Append(item) {
        item.frameId = this.frames.length;
        item.querySelector('.lineEdit').onclick = async () => {
            const val = item.querySelector('.lineValue');
            val.setAttribute("contenteditable", "true");
            val.focus();
            val.onblur = async () => {
                val.setAttribute("contenteditable", "false");
                item.line = val.innerText;
                await this.UpdateCanvas();
            }
        }
        item.querySelector('.lineRemove').onclick = async () => {
            this.frames[item.frameId] = null;
            item.remove();
            await this.UpdateCanvas();
        }
        this.frames.push(item);
    }
    async AddLine(line) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        const resWidth = imageData.width - this.props.offsetX * 2;
        const resHeight = imageData.height - this.props.offsetY - this.canvas.height * this.props.textHeight;
    
    
        const resized = await resizeImageData(imageData, resWidth, resHeight);
    
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = this.props.outlineWidth;
        this.ctx.strokeRect(this.props.offsetX - this.props.outlineOffset, this.props.offsetY - this.props.outlineOffset, resWidth + 2 * this.props.outlineOffset, resHeight + 2 * this.props.outlineOffset);
    
        
        this.ctx.putImageData(resized, this.props.offsetX, this.props.offsetY);
        this.ctx.fillStyle = "White";
        this.ctx.font = `${this.props.fontSize}px Times New Roman`;
        this.ctx.textAlign = "center";
        const [text, size] = this.MeasureText(line, 48);
        this.ctx.font = `${size}px Times New Roman`;
        const computedTextHeight = this.canvas.height * this.props.textHeight;
        for (let i = 0; i < text.length; i++) {
            this.ctx.fillText(text[i], this.canvas.width / 2, this.canvas.height - computedTextHeight / 2 + this.props.fontSize / 2 + (i - text.length / 2) * this.props.fontSize / 1.2);
        }
    }
    // works for 1-2 lines
    MeasureText(text, fontSize) {
        this.ctx.font = `${fontSize} Times New Roman`;
        const metrics = this.ctx.measureText(text);
        if (metrics.width > this.canvas.width - 50) {
            fontSize-=8;
            let [topHalf, topSize] = this.MeasureText(text.slice(0, text.length / 2), fontSize);
            let [botHalf, botSize] = this.MeasureText(text.slice(text.length / 2, text.length), fontSize);
            return [[...topHalf, ...botHalf], Math.min(topSize, botSize)];
        }
        return [[text], fontSize];
    }
    async CompileGIF() {
        if (!this.img) return;
        let encoder = new GIFEncoder();
        encoder.setRepeat(0);
        encoder.setDelay(this.props.delay);
        encoder.start();
        await this.UpdateCanvas((context) => {
            encoder.addFrame(context);
        })
        encoder.finish();
        encoder.download("default.gif");
    }
}

currentPicture = new Picture();
currentPicture.Display();




addNewLine.addEventListener('click', SumbitEvent);
newLine.addEventListener('keyup', async function(e) {
    if (e.key == "Enter") {
        await SumbitEvent();
    }
})

async function SumbitEvent() {
    const value = newLine.value;
    if (value.trim().length == 0 || !currentPicture.img) return;

    const newItem = GetNewItemList(value);
    currentPicture.Append(newItem);
    list.appendChild(newItem);

    newLine.value = "";
    await currentPicture.AddLine(value);
    newLine.focus();
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