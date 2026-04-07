import { gpu } from "lumen";
import * as gear from "gear";
import * as aether from "aether";
import { LinearDragging, positionDragging } from "../utils/dragging.js";
import { Renderer } from "./stroke.renderer.js";
import { TessellatedStrokeFactory } from "./stroke.computer.js";
import { Stroke } from "./stroke.js";
import { Brush } from "./brush.js";
import { Color, Pallette2D } from "./color.js";
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
    constructor(canvas, renderer, tessellatedStrokeFactory) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.tessellatedStrokeFactory = tessellatedStrokeFactory;
        this.strokes = [];
        this.brush = new Brush(this.canvas.device);
        this.backgroundColor = new Color([1, 1, 1, 1]);
        this.currentColor = "BRUSH";
        this.pallette2D = new Pallette2D([-1, -1], [0, 1], [1, -1]);
        this.hue = this.toHue2D(this.brush.color.hue);
        this.strokeTarget = gear.loops.draggingTarget(gear.property(this, "stroke"), new StrokeSampler(p => this.canvasSpacePos(p)));
        this.brushSizeTarget = gear.loops.draggingTarget(gear.property(this.brush, "thickness"), new LinearDragging(() => 0, 8, 40, 20));
        this.tensionTarget = gear.loops.draggingTarget(gear.property(this, "tension"), new LinearDragging(() => 0, 2, 128, 64));
        this.hueTarget = gear.loops.draggingTarget(gear.property(this, "hue2D"), positionDragging);
        this.intensityTarget = gear.loops.draggingTarget(gear.property(this, "intensity"), new LinearDragging(() => 0, 0, 1, 1));
        this.viewGroup = renderer.view(canvas.element);
    }
    static async create() {
        try {
            const device = await gpuDevice();
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element, 4);
            const renderer = await Renderer.create(device);
            const tessellatedStrokeFactory = await TessellatedStrokeFactory.create(device);
            return new Toy(canvas, renderer, tessellatedStrokeFactory);
        }
        catch (e) {
            gear.required(document.getElementById(Toy.descriptor.output.canvases.scene.element)).style.cursor = "default";
            throw e;
        }
    }
    canvasSpacePos(position) {
        return aether.vec2.mul(aether.vec2.mul(aether.vec2.add(position, [1, -1]), [0.5, -0.5]), [this.canvas.element.width, this.canvas.element.height]);
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
            ? new Stroke(this.brush.attributes, attributes => this.brush.destroyDataBuffer(attributes))
            : this.strokes[lastIndex];
    }
    set stroke(stroke) {
        const lastIndex = this.strokes.length - 1;
        if (lastIndex < 0 || this.strokes[lastIndex] !== stroke) {
            this.strokes.push(stroke);
        }
    }
    inputWiring(inputs, outputs) {
        const v = 0.01;
        return {
            keys: {
                paint: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
                tension: { onPressed: () => inputs.pointers.primary.draggingTarget = this.tensionTarget },
                hue: { onPressed: () => inputs.pointers.primary.draggingTarget = this.hueTarget },
                intensity: { onPressed: () => inputs.pointers.primary.draggingTarget = this.intensityTarget },
                toggleCurrentColor: { onPressed: () => this.currentColor = this.currentColor === "BRUSH" ? "BACKGROUND" : "BRUSH" },
                clear: { onPressed: () => this.clearStrokes() },
                undo: { onPressed: () => this.undo() },
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
    undo() {
        this.strokes.pop()?.destroy();
    }
    clearStrokes() {
        this.strokes.forEach(s => s.destroy());
        this.strokes = [];
    }
    outputWiring() {
        return {
            canvases: {
                scene: {
                    onResize: () => {
                        this.canvas.resize();
                        this.renderer.resize(this.viewGroup, this.canvas.element);
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
        this.renderer.renderTo(this.canvas.attachment({ r: c[0], g: c[1], b: c[2], a: c[3] }), this.strokes.map(s => {
            this.tessellatedStrokeFactory.strokeThickness = s.thickness;
            this.tessellatedStrokeFactory.strokeTension = s.tension;
            return s.strokeGroup(points => this.renderer.stroke(this.brush.dataBuffer(s.attributes), this.tessellatedStrokeFactory.tesselate(points)));
        }), this.viewGroup);
    }
}
Toy.descriptor = {
    input: {
        keys: {
            paint: {
                physicalKeys: [["KeyP"]],
                virtualKeys: "#control-p"
            },
            hue: {
                physicalKeys: [["KeyH"]],
                virtualKeys: "#control-h"
            },
            intensity: {
                physicalKeys: [["KeyI"]],
                virtualKeys: "#control-i"
            },
            brushSize: {
                physicalKeys: [["KeyB"]],
                virtualKeys: "#control-b"
            },
            tension: {
                physicalKeys: [["KeyT"]],
                virtualKeys: "#control-t"
            },
            toggleCurrentColor: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-c"
            },
            clear: {
                physicalKeys: [["ShiftRight", "Delete"], ["ShiftLeft", "Delete"]],
                virtualKeys: ".control-clear"
            },
            undo: {
                physicalKeys: [["Backspace"]],
                virtualKeys: "#control-undo"
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