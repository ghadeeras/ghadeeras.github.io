import * as aether from "aether";
import { required } from "gear";
import { Color, fromHex, hueOf } from "./color.js";
function template(id) {
    return /*html*/ `
<div id="${id}-palette">
    <div>
        <span>Hue</span>
        <div>
            <canvas id="${id}-hue" style="border: 2px solid black;"></canvas>
            <div id="${id}-hue-slider" style="position: absolute; top: 0px; width: 3px; height: 3px; border: 2px solid black; pointer-events: none;"></div>
        </div>
        <span><br/>Shade</span>
        <div>
            <canvas id="${id}-shade" style="border: 2px solid black;"></canvas>
            <div id="${id}-shade-slider" style="position: absolute; top: 0px; width: 3px; border: 2px solid black; pointer-events: none;"></div>
        </div>
        <span><br/>Opacity</span>
        <div>
            <canvas id="${id}-alpha" style="border: 2px solid black;"></canvas>
            <div id="${id}-alpha-slider" style="position: absolute; top: 0px; width: 3px; border: 2px solid black; pointer-events: none;"></div>
        </div>
    </div>
    <div>
        <span><br/>Hex: </span><input id="${id}-input" type="text" />
    <div>
    <div>
        <span><br/></span>
        <button id="${id}-ok">Ok</button>
        <button id="${id}-cancel">Cancel</button>
    </div>
</div>
`.trim();
}
export class Palette {
    constructor(parent, hueCanvas, hueSliderDiv, shadeCanvas, shadeSliderDiv, alphaCanvas, alphaSliderDiv, visibilitySetter) {
        this.parent = parent;
        this.hueCanvas = hueCanvas;
        this.hueSliderDiv = hueSliderDiv;
        this.shadeCanvas = shadeCanvas;
        this.shadeSliderDiv = shadeSliderDiv;
        this.alphaCanvas = alphaCanvas;
        this.alphaSliderDiv = alphaSliderDiv;
        this.visibilitySetter = visibilitySetter;
        this.callback = () => { };
        this.oldColor = [0, 0, 0, 0];
        this.newColor = new Color([0, 0, 0, 0], () => this.refresh());
        this.colorInput = required(document.getElementById(this.parent.id + "-input"));
        this.mouseDownTarget = null;
        parent.style.userSelect = "none";
        shadeSliderDiv.style.height = `${shadeCanvas.height}px`;
        alphaSliderDiv.style.height = `${alphaCanvas.height}px`;
        const okButton = required(document.getElementById(parent.id + "-ok"));
        const cancelButton = required(document.getElementById(parent.id + "-cancel"));
        okButton.onclick = () => this.callback(this.newColor.rgba);
        this.parent.oncancel = cancelButton.onclick = () => this.cancel();
        this.shadeCanvas.onpointerup = () => this.mouseDownTarget = null;
        this.onDrag(this.hueCanvas, (({ x, y }) => { this.newColor.hue = aether.vec3.from(hue(x, y, c => [...hueOf(aether.vec3.max(c, [0, 0, 0])), 1])); }));
        this.onDrag(this.shadeCanvas, (({ x, y: _ }) => { this.newColor.shade = 0.05 * (x + 10); }));
        this.onDrag(this.alphaCanvas, (({ x, y: _ }) => { this.newColor.alpha = 0.05 * (x + 10); }));
        this.colorInput.onkeydown = e => {
            if (e.code === "Enter") {
                this.newColor.rgba = fromHex(this.colorInput.value, this.newColor.rgba);
            }
        };
    }
    static async create(parent, visibilitySetter) {
        const [p, id] = parent instanceof HTMLElement
            ? [parent, parent.id]
            : [required(document.getElementById(parent)), parent];
        p.innerHTML = template(id);
        const hueCanvas = await newCanvas(id + "-hue", huesTriangle());
        const shadeCanvas = await newCanvas(id + "-shade", shadesBar());
        const alphaCanvas = await newCanvas(id + "-alpha", alphaBar());
        alphaCanvas.style.backgroundColor = "#00000000";
        return new Palette(p, hueCanvas, element(id + "-hue-slider"), shadeCanvas, element(id + "-shade-slider"), alphaCanvas, element(id + "-alpha-slider"), visibilitySetter);
    }
    pick(currentColor) {
        return new Promise((resolve, reject) => {
            this.newColor.rgba = this.oldColor = currentColor;
            this.visibilitySetter(true);
            this.callback = result => {
                this.callback = () => { };
                this.visibilitySetter(false);
                if (result instanceof Error) {
                    reject(result);
                }
                else {
                    resolve(result);
                }
            };
        });
    }
    cancel() {
        return this.callback(this.oldColor);
    }
    onDrag(canvas, callback) {
        canvas.onpointerdown = canvas.onmousemove = e => {
            e.stopImmediatePropagation();
            e.stopPropagation();
            if (e.type === "pointerdown") {
                this.mouseDownTarget = canvas;
            }
            if (this.mouseDownTarget === canvas && e.buttons !== 0) {
                callback(coords(canvas, e.offsetX, e.offsetY));
            }
        };
        canvas.onpointerup = () => this.mouseDownTarget = null;
    }
    refresh() {
        this.hueCanvas.style.backgroundColor = "#" + this.newColor.hex;
        this.colorInput.value = this.newColor.hex;
        const h = this.newColor.hue;
        const xy = pallete2D.fromColor(aether.vec3.scale(h, 1 / (h[0] + h[1] + h[2])));
        const c = canvasCoords(this.hueCanvas, ...xy);
        this.hueSliderDiv.style.left = `${c.x - this.hueSliderDiv.clientWidth / 2}px`;
        this.hueSliderDiv.style.top = `${c.y - this.hueSliderDiv.clientHeight / 2}px`;
        this.shadeSliderDiv.style.left = `${canvasCoords(this.shadeCanvas, this.newColor.shade * 20 - 10, 0).x - this.shadeSliderDiv.clientWidth / 2}px`;
        this.alphaSliderDiv.style.left = `${canvasCoords(this.alphaCanvas, this.newColor.alpha * 20 - 10, 0).x - this.alphaSliderDiv.clientWidth / 2}px`;
    }
}
function element(id) {
    return required(document.getElementById(id));
}
async function newCanvas(id, data) {
    const result = required(document.getElementById(id));
    result.width = data.width;
    result.height = data.height;
    const context = required(result.getContext("bitmaprenderer"));
    const bitmap = await window.createImageBitmap(data);
    context.transferFromImageBitmap(bitmap);
    return result;
}
function huesTriangle(defaultColor = [0, 0, 0, 0]) {
    return imageData(360, 320, (x, y) => hue(x, y, () => defaultColor));
}
function shadesBar() {
    return imageData(360, 36, (x, _) => {
        const s = 0.05 * (x + 10);
        return aether.vec4.of(s, s, s, 1.0);
    });
}
function alphaBar() {
    return imageData(360, 36, (x, _) => {
        const s = 0.05 * (x + 10);
        return aether.vec4.of(s, s, s, s);
    });
}
function imageData(width, height, shader) {
    const rawData = new Uint8ClampedArray(width * height * 4);
    const result = new ImageData(rawData, width, height, { colorSpace: "srgb", pixelFormat: "rgba-unorm8" });
    const s = 1 / (Math.min(width, height) - 1);
    let index = 0;
    for (let j = 0; j < height; j++) {
        const y = 2 * (height / 2 - j) * s;
        for (let i = 0; i < width; i++) {
            const x = 2 * (i - width / 2) * s;
            let c = shader(x, y).map(v => Math.round(255 * Math.min(Math.max(v, 0), 1)));
            result.data[index++] = c[0];
            result.data[index++] = c[1];
            result.data[index++] = c[2];
            result.data[index++] = c[3];
        }
    }
    return result;
}
function coords(canvas, canvasX, canvasY) {
    const w = canvas.clientWidth - 0.5;
    const h = canvas.clientHeight - 0.5;
    const s = 2 / Math.min(w, h);
    const x = (canvasX - w / 2) * s;
    const y = (h / 2 - canvasY) * s;
    return { x, y };
}
function canvasCoords(canvas, cx, cy) {
    const w = canvas.clientWidth - 0.5;
    const h = canvas.clientHeight - 0.5;
    const s = Math.min(w, h) / 2;
    const x = cx * s + w / 2;
    const y = h / 2 - cy * s;
    return { x, y };
}
function hue(x, y, defaultColor) {
    let color = pallete2D.toColor([x, y]);
    return color.every(v => v >= 0)
        ? [...hueOf(color), 1]
        : defaultColor(color);
}
export class Pallette2D {
    constructor(red, green, blue) {
        this.bary = new aether.Bary([...red, 0], [...green, 0], [...blue, 0]);
    }
    toColor(position) {
        return this.bary.fromCartesian([...position, 0]);
    }
    fromColor(color) {
        const cartesian = this.bary.toCartesian(color);
        return aether.vec2.from(cartesian);
    }
}
const pallete2D = new Pallette2D([-1, -Math.sqrt(0.75)], [0, Math.sqrt(0.75)], [1, -Math.sqrt(0.75)]);
//# sourceMappingURL=palette.js.map