import { gpu } from "lumen";
import * as gear from "gear";
import * as aether from "aether";
import { LinearDragging, positionDragging, TranslationDragging } from "../utils/dragging.js";
import { Renderer } from "./stroke.renderer.js";
import { TessellatedStrokeFactory } from "./stroke.computer.js";
import { Stroke } from "./stroke.js";
import { Brush } from "./brush.js";
import { Color, fromHex, Pallette2D, toHex } from "./color.js";
import { BackgroundRenderer } from "./bg.renderer.js";
import * as cmn from "./common.js";
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/sketch";
export const huds = {
    "monitor": "monitor-button"
};
export async function init() {
    const toy = await Toy.create();
    const loop = gear.loops.newLoop(toy, Toy.descriptor);
    loop.run();
}
class Toy {
    constructor(canvas, renderer, tessellatedStrokeFactory, backgroundRenderer) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.tessellatedStrokeFactory = tessellatedStrokeFactory;
        this.backgroundRenderer = backgroundRenderer;
        this.backgroundGroup = null;
        this.strokes = [];
        this.brush = new Brush(this.canvas.device);
        this.lines = false;
        this.backgroundColor = new Color([1, 1, 1, 1]);
        this.currentColor = "BRUSH";
        this.pallette2D = new Pallette2D([-1, -1], [0, 1], [1, -1]);
        this.inverseViewMatrix = aether.mat3.identity();
        this.viewMatrix = aether.mat3.identity();
        this.hue = this.toHue2D(this.brush.color.hue);
        this.strokeTarget = gear.loops.draggingTarget(gear.property(this, "stroke"), new StrokeSampler(p => this.infiniteCanvasSpacePos(p)));
        this.brushSizeTarget = gear.loops.draggingTarget(gear.property(this.brush, "thickness"), new LinearDragging(() => 0, 8, 40, 20));
        this.tensionTarget = gear.loops.draggingTarget(gear.property(this, "tension"), new LinearDragging(() => 0, 2, 128, 64));
        this.hueTarget = gear.loops.draggingTarget(gear.property(this, "hue2D"), positionDragging);
        this.intensityTarget = gear.loops.draggingTarget(gear.property(this, "intensity"), new LinearDragging(() => 0, 0, 1, 1));
        this.slidingTarget = gear.loops.draggingTarget(gear.property(this, "matrix"), TranslationDragging.dragger(() => {
            return aether.mat4.scaling(-2 / this.canvas.element.width, 2 / this.canvas.element.height, 1);
        }, 1));
        this.imageFileSelector = gear.FileSelector.create().disallowMultipleFiles().ofType("image/*");
        this.jsonFileSelector = gear.FileSelector.create().disallowMultipleFiles().ofType("application/json");
        this.viewGroup = renderer.view(this.view);
    }
    static async create() {
        try {
            const device = await gpuDevice();
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element, 4);
            const commonLayouts = cmn.groupLayouts(device);
            const renderer = await Renderer.create(commonLayouts);
            const tessellatedStrokeFactory = await TessellatedStrokeFactory.create(device);
            const backgroundRenderer = await BackgroundRenderer.create(commonLayouts.view);
            return new Toy(canvas, renderer, tessellatedStrokeFactory, backgroundRenderer);
        }
        catch (e) {
            gear.required(document.getElementById(Toy.descriptor.output.canvases.scene.element)).style.cursor = "default";
            throw e;
        }
    }
    infiniteCanvasSpacePos(position) {
        return aether.vec2.from(aether.mat3.apply(this.inverseViewMatrix, [...this.canvasSpacePos(position), 1]));
    }
    canvasSpacePos(position) {
        return aether.vec2.mul(aether.vec2.mul(aether.vec2.add(position, [1, -1]), [0.5, -0.5]), [this.canvas.element.width, this.canvas.element.height]);
    }
    get matrix() {
        let m = this.inverseViewMatrix;
        return [
            [...m[0], 0],
            [...m[1], 0],
            [0, 0, 1, 0],
            [...m[2], 1],
        ];
    }
    set matrix(matrix) {
        const m = matrix
            .filter((_, i) => i != 2)
            .map(r => [r[0], r[1], r[3]])
            .flatMap(r => r);
        this.inverseViewMatrix = aether.mat3.from(m);
        this.viewMatrix = aether.mat3.inverse(this.inverseViewMatrix);
        this.renderer.updateView(this.viewGroup, this.view);
    }
    get color() {
        return this.currentColor === "BRUSH" ? this.brush.color : this.backgroundColor;
    }
    get hue2D() {
        return this.hue;
    }
    set hue2D(hue2D) {
        this.hue = hue2D;
        const p = aether.vec2.scale(aether.vec2.mul(hue2D, [this.canvas.element.width, this.canvas.element.height]), 1 / Math.min(this.canvas.element.width, this.canvas.element.height));
        this.color.hue = this.pallette2D.toColor(p);
    }
    get intensity() {
        return this.color.intensity;
    }
    set intensity(intensity) {
        this.color.intensity = intensity;
    }
    toHue2D(hue) {
        const p = this.pallette2D.fromColor(hue);
        return aether.vec2.scale(aether.vec2.mul(p, [this.canvas.element.height, this.canvas.element.width]), 1 / Math.max(this.canvas.element.width, this.canvas.element.height));
    }
    get tension() {
        return this.tessellatedStrokeFactory.strokeTension;
    }
    set tension(tension) {
        this.brush.tension = tension;
        for (const s of this.strokes) {
            s.tension = tension;
        }
    }
    get stroke() {
        const lastIndex = this.strokes.length - 1;
        return lastIndex < 0 || this.strokes[lastIndex].finalized
            ? new Stroke(this.brush.attributes, attributes => this.brush.destroyDataBuffer(attributes), this.lines ? Number.POSITIVE_INFINITY : 4)
            : this.strokes[lastIndex];
    }
    set stroke(stroke) {
        const lastIndex = this.strokes.length - 1;
        if (lastIndex < 0 || this.strokes[lastIndex] !== stroke) {
            this.strokes.push(stroke);
        }
    }
    get view() {
        return {
            matrix: this.viewMatrix,
            inverse_matrix: this.inverseViewMatrix,
            width: this.canvas.element.width,
            height: this.canvas.element.height
        };
    }
    inputWiring(inputs, outputs) {
        const v = 0.01;
        return {
            keys: {
                drawing: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
                tension: { onPressed: () => inputs.pointers.primary.draggingTarget = this.tensionTarget },
                hue: { onPressed: () => { this.setColorDraggingTarget(inputs, "BRUSH", this.hueTarget); } },
                intensity: { onPressed: () => { this.setColorDraggingTarget(inputs, "BRUSH", this.intensityTarget); } },
                backgroundHue: { onPressed: () => { this.setColorDraggingTarget(inputs, "BACKGROUND", this.hueTarget); } },
                backgroundIntensity: { onPressed: () => { this.setColorDraggingTarget(inputs, "BACKGROUND", this.intensityTarget); } },
                sliding: { onPressed: () => inputs.pointers.primary.draggingTarget = this.slidingTarget },
                clear: { onPressed: () => this.clearStrokes() },
                undo: { onPressed: () => this.undo() },
                toggleClosed: { onPressed: () => this.brush.closed = !this.brush.closed },
                toggleLines: { onPressed: () => this.lines = !this.lines }, loadBackgroundImage: { onReleased: () => this.loadNewBackgroundImage() },
                clearBackgroundImage: { onPressed: () => this.clearBackgroundImage() },
                resetViewMatrix: { onPressed: () => this.matrix = aether.mat4.identity() },
                break: { onPressed: () => this.breakStroke() },
                save: { onReleased: () => this.save() },
                load: { onReleased: () => this.load() },
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() },
            },
            pointers: {
                primary: {
                    defaultDraggingTarget: this.strokeTarget,
                    onMoved: () => this.brush.position = this.canvasSpacePos(inputs.pointers.primary.position)
                }
            }
        };
    }
    outputWiring() {
        return {
            canvases: {
                scene: {
                    onResize: () => {
                        this.canvas.resize();
                        this.renderer.updateView(this.viewGroup, this.view);
                    }
                }
            },
            onRender: () => this.render()
        };
    }
    animate() {
    }
    render() {
        const c = this.backgroundColor.rgba;
        const attachment = { ...this.canvas.attachment({ r: c[0], g: c[1], b: c[2], a: c[3] }), storeOp: "store" };
        if (this.backgroundGroup !== null) {
            this.backgroundRenderer.renderTo(attachment, this.backgroundGroup, this.viewGroup);
            attachment.loadOp = "load";
            attachment.storeOp = "discard";
        }
        this.renderer.renderTo(attachment, this.strokes.map(s => {
            this.tessellatedStrokeFactory.strokeThickness = s.thickness;
            this.tessellatedStrokeFactory.strokeTension = s.tension;
            this.tessellatedStrokeFactory.strokeClosed = s.closed;
            return {
                group: s.strokeGroup(points => this.renderer.stroke(this.brush.dataBuffer(s.attributes), this.tessellatedStrokeFactory.tesselate(points))),
                closed: s.closed
            };
        }), this.viewGroup);
    }
    breakStroke() {
        const stroke = this.strokes.pop();
        if (stroke !== undefined) {
            const strokes = stroke.break();
            this.strokes.push(...strokes);
        }
    }
    setColorDraggingTarget(inputs, color, draggingTarget) {
        this.currentColor = color;
        inputs.pointers.primary.draggingTarget = draggingTarget;
    }
    clearBackgroundImage() {
        if (this.backgroundGroup !== null) {
            this.backgroundGroup.entries.background_texture.baseResource().destroy();
            this.backgroundGroup = null;
        }
    }
    async loadNewBackgroundImage() {
        const file = await this.imageFileSelector.select();
        if (file.length == 1) {
            const imageBitmap = await createImageBitmap(file[0]);
            const texture = this.canvas.device.texture({
                size: [imageBitmap.width, imageBitmap.height],
                format: this.canvas.format,
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            });
            this.canvas.device.wrapped.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: texture.wrapped }, [imageBitmap.width, imageBitmap.height]);
            if (this.backgroundGroup !== null) {
                this.backgroundGroup.entries.background_texture.baseResource().destroy();
            }
            this.backgroundGroup = await this.backgroundRenderer.background(texture);
        }
    }
    undo() {
        this.strokes.pop()?.destroy();
    }
    clearStrokes() {
        this.strokes.forEach(s => s.destroy());
        this.strokes = [];
    }
    save() {
        const indices = new Map();
        const strokes = [];
        const attributes = [];
        for (const s of this.strokes) {
            let buffer = this.brush.dataBuffer(s.attributes);
            let index = indices.get(buffer);
            if (index === undefined) {
                index = attributes.length;
                attributes.push(s.attributes);
                indices.set(buffer, index);
            }
            strokes.push({
                attributes: index,
                points: s.points.map(p => p.position)
            });
        }
        const sketch = {
            strokes,
            strokesAttributes: attributes.map(toSerializableAttributes),
            backgroundColor: toHex(this.backgroundColor.rgba)
        };
        gear.save(URL.createObjectURL(new Blob([JSON.stringify(sketch)])), 'application/json', 'Sketch.json');
    }
    async load() {
        const file = await this.jsonFileSelector.select();
        if (file.length == 1) {
            const text = await file[0].text();
            const sketch = JSON.parse(text);
            this.clearStrokes();
            this.backgroundColor.rgba = typeof sketch.backgroundColor === "string" ? fromHex(sketch.backgroundColor) : sketch.backgroundColor;
            for (const s of sketch.strokes) {
                const attributes = fromSerializableAttributes(sketch.strokesAttributes[s.attributes]);
                const stroke = new Stroke(attributes, attributes => this.brush.destroyDataBuffer(attributes));
                for (const p of s.points) {
                    stroke.addPoint(p);
                }
                stroke.finalize();
                this.strokes.push(stroke);
            }
        }
    }
}
Toy.descriptor = {
    input: {
        keys: {
            drawing: {
                physicalKeys: [["KeyD"]],
                virtualKeys: "#control-d"
            },
            hue: {
                physicalKeys: [["KeyH"]],
                virtualKeys: "#control-h"
            },
            intensity: {
                physicalKeys: [["KeyI"]],
                virtualKeys: "#control-i"
            },
            backgroundHue: {
                physicalKeys: [["ShiftRight", "KeyH"], ["ShiftLeft", "KeyH"]],
                virtualKeys: ".control-bg-h"
            },
            backgroundIntensity: {
                physicalKeys: [["ShiftRight", "KeyI"], ["ShiftLeft", "KeyI"]],
                virtualKeys: ".control-bg-i"
            },
            brushSize: {
                physicalKeys: [["KeyB"]],
                virtualKeys: "#control-b"
            },
            tension: {
                physicalKeys: [["KeyT"]],
                virtualKeys: "#control-t"
            },
            sliding: {
                physicalKeys: [["KeyS"]],
                virtualKeys: "#control-s"
            },
            clear: {
                physicalKeys: [["ShiftRight", "Delete"], ["ShiftLeft", "Delete"]],
                virtualKeys: ".control-clear"
            },
            undo: {
                physicalKeys: [["Backspace"]],
                virtualKeys: "#control-undo"
            },
            toggleClosed: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-closed"
            },
            toggleLines: {
                physicalKeys: [["KeyL"]],
                virtualKeys: "#control-lines"
            },
            loadBackgroundImage: {
                physicalKeys: [["KeyG"]],
                virtualKeys: "#control-load-bg"
            },
            clearBackgroundImage: {
                physicalKeys: [["Delete", "KeyG"]],
                virtualKeys: ".control-clear-bg"
            },
            resetViewMatrix: {
                physicalKeys: [["Delete", "KeyS"]],
                virtualKeys: ".control-reset-view"
            },
            break: {
                physicalKeys: [["Enter"]],
                virtualKeys: "#control-break"
            },
            save: {
                physicalKeys: [["ControlLeft", "KeyS"], ["ControlRight", "KeyS"]],
                virtualKeys: ".control-save"
            },
            load: {
                physicalKeys: [["ControlLeft", "KeyL"], ["ControlRight", "KeyL"]],
                virtualKeys: ".control-load"
            },
            record: {
                physicalKeys: [["KeyV"]],
                virtualKeys: "#control-v"
            },
        },
        pointers: {
            primary: {
                element: "canvas"
            }
        }
    },
    output: {
        canvases: {
            scene: {
                element: "canvas"
            }
        },
        fps: {
            element: "freq-watch"
        },
        styling: {
            pressedButton: "pressed"
        },
    },
};
class StrokeSampler {
    constructor(canvasSpacePos) {
        this.canvasSpacePos = canvasSpacePos;
    }
    begin(stroke) {
        return position => {
            stroke.addPoint(this.canvasSpacePos(position));
            return stroke;
        };
    }
    end(stroke) {
        stroke.finalize();
        return stroke;
    }
}
function toSerializableAttributes(a) {
    return {
        color: toHex(a.color),
        thickness: Math.round(a.thickness),
        tension: Math.round(a.tension),
        closed: a.closed === 1
    };
}
function fromSerializableAttributes(serializableAttributes) {
    return {
        color: typeof serializableAttributes.color === "string" ? fromHex(serializableAttributes.color) : serializableAttributes.color,
        thickness: serializableAttributes.thickness,
        tension: serializableAttributes.tension,
        closed: serializableAttributes.closed ? 1 : 0
    };
}
async function gpuDevice() {
    const gpuStatus = gear.required(document.getElementById("gpu-status"));
    try {
        const device = await gpu.Device.instance();
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}";
        return device;
    }
    catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!";
        throw e;
    }
}
//# sourceMappingURL=toy.js.map