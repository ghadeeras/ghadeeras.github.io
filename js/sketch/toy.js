import { gpu } from "lumen";
import * as gear from "gear";
import * as aether from "aether";
import { LinearDragging } from "../utils/dragging.js";
export const huds = {
    "monitor": "monitor-button"
};
export async function init() {
    const toy = await Toy.create();
    const loop = gear.loops.newLoop(toy, Toy.descriptor);
    loop.run();
}
class Toy {
    constructor(canvas) {
        this.canvas = canvas;
        this.strokes = [];
        this.brush = new Brush();
        this.strokeTarget = gear.loops.draggingTarget(gear.property(this, "stroke"), new StrokeSampler(p => this.canvasSpacePos(p)));
        this.brushSizeTarget = gear.loops.draggingTarget(gear.property(this.brush, "size"), new LinearDragging(() => 0, 1, 40, 20));
        this.context = gear.required(this.canvas.getContext("2d"));
    }
    static async create() {
        try {
            const device = await gpuDevice();
        }
        catch (e) {
            console.warn("WebGPU not supported, falling back to CPU rendering");
        }
        const canvas = document.getElementById(Toy.descriptor.output.canvases.scene.element);
        return new Toy(canvas);
    }
    canvasSpacePos(position) {
        return aether.vec2.mul(aether.vec2.mul(aether.vec2.add(position, [1, -1]), [0.5, -0.5]), [this.canvas.width, this.canvas.height]);
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
        }
    }
    inputWiring(inputs, outputs) {
        const v = 0.01;
        return {
            keys: {
                paint: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
                clear: { onPressed: () => this.strokes = [] },
                undo: { onPressed: () => this.strokes.pop() },
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
                    onResize: () => { }
                }
            },
            onRender: () => this.render()
        };
    }
    animate() {
    }
    render() {
        const ctx = this.context;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = "black";
        for (const stroke of this.strokes) {
            ctx.lineWidth = stroke.brushSize;
            ctx.beginPath();
            const pos0 = stroke.points[0].position;
            if (stroke.points.length == 1) {
                ctx.ellipse(pos0[0], pos0[1], 2, 2, 0, 0, 2 * Math.PI);
            }
            else {
                ctx.moveTo(pos0[0], pos0[1]);
                for (let i = 1; i < stroke.points.length; i++) {
                    const pos = stroke.points[i].position;
                    ctx.lineTo(pos[0], pos[1]);
                }
            }
            ctx.stroke();
        }
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
        this._size = 4;
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