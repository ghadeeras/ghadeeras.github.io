import { gpu } from "lumen";
import * as gear from "gear";
import * as aether from "aether";
import { LinearDragging } from "../utils/dragging.js";
import { Renderer } from "./stroke.renderer.js";
import { TessellatedStrokeFactory } from "./stroke.computer.js";
import { Stroke } from "./stroke.js";
import { Brush } from "./brush.js";
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
        this.brush = new Brush();
        this.strokeTarget = gear.loops.draggingTarget(gear.property(this, "stroke"), new StrokeSampler(p => this.canvasSpacePos(p)));
        this.brushSizeTarget = gear.loops.draggingTarget(gear.property(this.brush, "size"), new LinearDragging(() => 0, 8, 40, 20));
        this.tensionTarget = gear.loops.draggingTarget(gear.property(this, "tension"), new LinearDragging(() => 0, 2, 128, 64));
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
    get tension() {
        return this.tessellatedStrokeFactory.strokeTension;
    }
    set tension(tension) {
        console.log(tension);
        this.brush.tension = tension;
        for (const s of this.strokes) {
            s.tension = tension;
        }
    }
    get stroke() {
        const lastIndex = this.strokes.length - 1;
        return lastIndex < 0 || this.strokes[lastIndex].finalized
            ? new Stroke(this.brush.size, this.brush.tension)
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
        this.renderer.renderTo(this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 }), this.strokes.map(s => {
            this.tessellatedStrokeFactory.strokeThickness = s.thickness;
            this.tessellatedStrokeFactory.strokeTension = s.tension;
            return s.strokeGroup(points => this.renderer.stroke(this.tessellatedStrokeFactory.tesselate(points)));
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
            brushSize: {
                physicalKeys: [["KeyB"]],
                virtualKeys: "#control-b"
            },
            tension: {
                physicalKeys: [["KeyT"]],
                virtualKeys: "#control-t"
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