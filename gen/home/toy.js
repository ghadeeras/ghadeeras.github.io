var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as djee from "../djee/all.js";
import * as gear from "../../gear/latest/index.js";
const mySketch = new Image();
const square = [
    -1, +1,
    -1, -1,
    +1, +1,
    +1, -1
];
export function init() {
    window.onload = doInit;
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield gear.fetchTextFiles({
            vertexShaderCode: "mandelbrot.vert",
            fragmentShaderCode: "home.frag"
        }, "/shaders");
        const context = djee.Context.of("canvas");
        const vertexShader = context.shader(djee.ShaderType.VertexShader, shaders.vertexShaderCode);
        const fragmentShader = context.shader(djee.ShaderType.FragmentShader, shaders.fragmentShaderCode);
        const program = vertexShader.linkTo(fragmentShader);
        program.use();
        const texture = context.newTexture2D();
        texture.setRawImage({
            format: WebGLRenderingContext.RGBA,
            width: 2,
            height: 2,
            pixels: new Uint8Array([
                0xFF, 0x00, 0x00, 0xFF, 0x00, 0x00, 0xFF, 0xFF,
                0x00, 0x00, 0xFF, 0xFF, 0x00, 0xFF, 0x00, 0xFF
            ])
        });
        const buffer = context.newAttributesBuffer();
        buffer.float32Data = square;
        const effect = program.uniform("effect");
        effect.data = [0];
        const mousePos = program.uniform("mousePos");
        mousePos.data = [0x10000, 0x10000];
        const sampler = program.uniform("sampler");
        sampler.data = [texture.unit];
        const vertex = program.attribute("vertex");
        vertex.pointTo(buffer);
        draw(context);
        mySketch.onload = () => updateTexture(texture);
        mySketch.src = "/MySketch.png";
        context.canvas.ontouchmove = event => event.preventDefault();
        context.canvas.onpointermove = event => distortImage(event, mousePos);
        context.canvas.onpointerleave = () => restoreImage(mousePos, effect);
        context.canvas.onclick = event => useCurrentImage(event, mousePos, texture);
        context.canvas.ondblclick = event => restoreOriginalImage(event, texture);
        context.canvas.ondragover = event => tearImage(event, mousePos, effect);
        context.canvas.ondrop = event => loadImage(event, effect);
    });
}
function draw(context) {
    const gl = context.gl;
    gl.viewport(0, 0, context.canvas.width, context.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();
}
function updateTexture(texture) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = texture.context;
        const canvas = context.canvas;
        const image = yield createImageBitmap(mySketch, 0, 0, mySketch.naturalWidth, mySketch.naturalHeight, {
            resizeWidth: canvas.width,
            resizeHeight: canvas.height
        });
        texture.setImageSource(image);
        draw(context);
    });
}
function useCurrentImage(e, mousePos, texture) {
    return __awaiter(this, void 0, void 0, function* () {
        distortImage(e, mousePos);
        const image = yield createImageBitmap(texture.context.canvas, 0, 0, mySketch.naturalWidth, mySketch.naturalHeight);
        texture.setImageSource(image);
    });
}
function distortImage(e, mousePos) {
    e.preventDefault();
    mousePos.data = normalizePosition(e);
    draw(mousePos.program.context);
}
function restoreImage(mousePos, effect) {
    mousePos.data = [0x10000, 0x10000];
    effect.data = [(effect.data[0] + 1) % 3];
    draw(mousePos.program.context);
}
function restoreOriginalImage(e, texture) {
    e.preventDefault();
    updateTexture(texture);
}
function tearImage(e, mousePos, effect) {
    e.preventDefault();
    mousePos.data = normalizePosition(e);
    if (effect.data[0] < 3) {
        effect.data = [effect.data[0] + 3];
    }
    draw(mousePos.program.context);
}
function loadImage(e, effect) {
    return __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        effect.data = [effect.data[0] - 3];
        if (e.dataTransfer) {
            const item = e.dataTransfer.items[0];
            if (item.kind == 'file') {
                const url = URL.createObjectURL(item.getAsFile());
                mySketch.src = url;
            }
            else {
                item.getAsString(url => {
                    mySketch.crossOrigin = isCrossOrigin(url) ? "anonymous" : null;
                    mySketch.src = url;
                });
            }
        }
    });
}
function isCrossOrigin(url) {
    const urlObj = new URL(url, window.location.href);
    const isCrossOrigin = urlObj.origin != window.location.origin;
    return isCrossOrigin;
}
function normalizePosition(e) {
    const canvas = e.target;
    return [
        (2 * e.offsetX - canvas.clientWidth) / canvas.clientWidth,
        (canvas.clientHeight - 2 * e.offsetY) / canvas.clientHeight
    ];
}
//# sourceMappingURL=toy.js.map