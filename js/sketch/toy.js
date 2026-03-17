import { gpu } from "lumen";
import * as gear from "gear";
import * as aether from "aether";
import { LinearDragging } from "../utils/dragging.js";
import { Renderer } from "./stroke.renderer.js";
export const huds = {
    "monitor": "monitor-button"
};
export async function init() {
    const toy = await Toy.create();
    const loop = gear.loops.newLoop(toy, Toy.descriptor);
    loop.run();
}
class Toy {
    constructor(canvas, renderer) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.strokes = [];
        this.strokeGroups = [];
        this.brush = new Brush();
        this.strokeTarget = gear.loops.draggingTarget(gear.property(this, "stroke"), new StrokeSampler(p => this.canvasSpacePos(p)));
        this.brushSizeTarget = gear.loops.draggingTarget(gear.property(this.brush, "size"), new LinearDragging(() => 0, 8, 40, 20));
        this.viewGroup = renderer.view(canvas.element);
    }
    static async create() {
        try {
            const device = await gpuDevice();
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element);
            const renderer = await Renderer.create(device);
            return new Toy(canvas, renderer);
        }
        catch (e) {
            console.warn("WebGPU not supported, falling back to CPU rendering");
            throw e;
        }
    }
    canvasSpacePos(position) {
        return aether.vec2.mul(aether.vec2.mul(aether.vec2.add(position, [1, -1]), [0.5, -0.5]), [this.canvas.element.width, this.canvas.element.height]);
    }
    get stroke() {
        const lastIndex = this.strokes.length - 1;
        return lastIndex < 0 || this.strokes[lastIndex].finalized
            ? new Stroke(this.brush.size)
            : this.strokes[lastIndex];
    }
    set stroke(stroke) {
        const lastIndex = this.strokes.length - 1;
        if (lastIndex < 0 || this.strokes[lastIndex] !== stroke) {
            this.strokes.push(stroke);
            this.strokeGroups.push(this.strokeGroup(stroke));
        }
        else if (lastIndex >= 0) {
            const oldGroup = this.strokeGroups[lastIndex];
            this.strokeGroups[lastIndex] = this.strokeGroup(stroke);
            this.destroy(oldGroup);
        }
    }
    strokeGroup(stroke) {
        return this.renderer.stroke(stroke.points.map(p => ({ control_point: p.position })), {
            brush_size: this.brush.size,
            locality: 0.125 * Math.ceil(this.brush.size / 40),
            resolution: Math.ceil(400 / this.brush.size)
        });
    }
    inputWiring(inputs, outputs) {
        const v = 0.01;
        return {
            keys: {
                paint: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
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
        this.strokes.pop();
        const group = this.strokeGroups.pop();
        if (group !== undefined) {
            this.destroy(group);
        }
    }
    clearStrokes() {
        this.strokes = [];
        this.strokeGroups.forEach(g => this.destroy(g));
        this.strokeGroups = [];
    }
    destroy(group) {
        group.entries.stroke.baseResource().destroy();
        group.entries.strokeAttributes.baseResource().destroy();
    }
    outputWiring() {
        return {
            canvases: {
                scene: {
                    onResize: () => this.renderer.resize(this.viewGroup, this.canvas.element)
                }
            },
            onRender: () => this.render()
        };
    }
    animate() {
    }
    render() {
        this.renderer.renderTo(this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 }), this.strokeGroups, this.viewGroup);
    }
}
Toy.descriptor = {
    input: {
        keys: {
            paint: {
                physicalKeys: [["KeyP"]],
                virtualKeys: "#control-p"
            },
            brushSize: {
                physicalKeys: [["KeyB"]],
                virtualKeys: "#control-b"
            },
            clear: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-c"
            },
            undo: {
                physicalKeys: [["KeyU"]],
                virtualKeys: "#control-u"
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
class Stroke {
    constructor(brushSize) {
        this.brushSize = brushSize;
        this.points = [];
        this._startTime = performance.now();
        this._endTime = this._startTime;
        this._length = 0;
        this._finalized = false;
    }
    get duration() {
        return this._endTime - this._startTime;
    }
    get length() {
        return this._length;
    }
    get finalized() {
        return this._finalized;
    }
    finalize() {
        this._finalized = true;
    }
    addPoint(position) {
        if (this._finalized) {
            throw new Error("Cannot add point to a finalized stroke");
        }
        this._endTime = performance.now();
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const beforeLastPoint = this.points.length > 1 ? this.points[this.points.length - 2] : lastPoint;
            const lastDistance = aether.vec2.length(aether.vec2.sub(lastPoint.position, beforeLastPoint.position));
            const lastDeltaTime = lastPoint.time - beforeLastPoint.time;
            const prevPoint = lastDistance < this.brushSize / (1 + 0.01 * lastDeltaTime) ? beforeLastPoint : lastPoint;
            if (prevPoint !== lastPoint) {
                this.points.pop();
                this._length -= lastDistance;
            }
            const distance = aether.vec2.length(aether.vec2.sub(position, prevPoint.position));
            this._length += distance;
        }
        this.points.push({ position: position, time: this._endTime, distance: this._length });
    }
}
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
class Brush {
    constructor() {
        this.cursor = gear.required(document.getElementById("cursor"));
        this.circle = gear.required(this.cursor.getElementsByTagName("circle")[0]);
        this._size = 8;
        this._position = [0, 0];
        this.size = this._size;
    }
    get size() {
        return this._size;
    }
    set size(size) {
        this._size = size;
        const radius = this._size / window.devicePixelRatio;
        this.circle.setAttribute("r", `${radius}`);
        this.circle.setAttribute("stroke-width", `${radius}`);
    }
    get position() {
        return this._position;
    }
    set position(pos) {
        this._position = pos;
        this.cursor.style.left = `${this._position[0] / window.devicePixelRatio - this.cursor.clientWidth / 2}px`;
        this.cursor.style.top = `${this._position[1] / window.devicePixelRatio - this.cursor.clientHeight / 2}px`;
        this.cursor.style.display = "block";
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