import { gpu } from "lumen";
import * as dragging from "../utils/dragging.js";
import { FieldRenderer } from "./renderer.js";
import { FieldSampler } from "./sampler.js";
import * as aether from "aether";
import * as gear from "gear";
export const huds = {
    "monitor": "monitor-button"
};
export async function init() {
    const toy = await Toy.create();
    const loop = gear.loops.newLoop(toy, Toy.descriptor);
    loop.run();
}
class Toy {
    constructor(canvas, fieldRenderer, fieldSampler) {
        this.canvas = canvas;
        this.fieldRenderer = fieldRenderer;
        this.fieldSampler = fieldSampler;
        this.contourTarget = gear.loops.draggingTarget(mapped(gear.property(this.fieldRenderer, "contourValue"), ([_, y]) => y), dragging.positionDragging);
        this.rotationDragging = gear.loops.draggingTarget(gear.property(this.fieldRenderer, "modelMatrix"), dragging.RotationDragging.dragger(() => this.fieldRenderer.projectionViewMatrix, 4));
        this.matrixDragging = gear.loops.draggingTarget(gear.property(this, "matrix"), dragging.RotationDragging.dragger(() => aether.mat4.identity()));
        this.scaleDragging = gear.loops.draggingTarget(gear.property(this, "scale"), dragging.RatioDragging.dragger(Math.SQRT1_2, Math.SQRT2, 0.5));
        this.speeds = [[0, 0], [0, 0], [0, 0]];
        this.resampling = new gear.DeferredComputation(() => this.fieldSampler.sample());
        this.lodElement = gear.required(document.getElementById("lod"));
        this.changeDepth(0);
    }
    static async create() {
        const device = await gpuDevice();
        const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element);
        const sampler = await FieldSampler.create(device);
        const renderer = await FieldRenderer.create(sampler.fieldTexture, canvas);
        return new Toy(canvas, renderer, sampler);
    }
    get scale() {
        return this.fieldSampler.scale;
    }
    set scale(v) {
        this.fieldSampler.scale = v;
        this.resampling.perform();
    }
    get matrix() {
        return aether.mat4.cast(this.fieldSampler.matrix);
    }
    set matrix(m) {
        this.fieldSampler.matrix = [
            aether.vec3.from(m[0]),
            aether.vec3.from(m[1]),
            aether.vec3.from(m[2]),
        ];
        this.resampling.perform();
    }
    changeDepth(delta) {
        this.fieldSampler.depth += delta;
        this.fieldRenderer.step = Math.pow(0.5, this.fieldSampler.depth / 3.0 + 3.0);
        this.resampling.perform();
        this.lodElement.innerText = this.fieldSampler.depth.toFixed(0);
    }
    inputWiring(inputs, outputs) {
        const v = 0.01;
        return {
            keys: {
                contour: { onPressed: () => inputs.pointers.primary.draggingTarget = this.contourTarget },
                rotation: { onPressed: () => inputs.pointers.primary.draggingTarget = this.rotationDragging },
                matrix: { onPressed: () => inputs.pointers.primary.draggingTarget = this.matrixDragging },
                scale: { onPressed: () => inputs.pointers.primary.draggingTarget = this.scaleDragging },
                incDepth: { onPressed: () => this.changeDepth(+1) },
                decDepth: { onPressed: () => this.changeDepth(-1) },
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() },
            },
            pointers: {
                primary: {
                    defaultDraggingTarget: this.rotationDragging
                }
            }
        };
    }
    outputWiring() {
        return {
            canvases: {
                scene: {
                    onResize: () => this.canvas.resize()
                }
            },
            onRender: () => this.render()
        };
    }
    animate() {
        let v = [
            this.speeds[0][0] - this.speeds[0][1],
            this.speeds[1][0] - this.speeds[1][1],
            this.speeds[2][1] - this.speeds[2][0],
        ];
        const velocity = aether.vec3.from(aether.vec4.prod([...v, 0], this.fieldRenderer.orientation));
        this.fieldRenderer.position = aether.vec3.add(this.fieldRenderer.position, velocity);
    }
    render() {
        this.fieldRenderer.render(this.canvas.attachment({ r: 0, g: 0, b: 0, a: 0 }));
    }
}
Toy.descriptor = {
    input: {
        keys: {
            contour: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-c"
            },
            rotation: {
                physicalKeys: [["KeyR"]],
                virtualKeys: "#control-r"
            },
            scale: {
                physicalKeys: [["KeyS"]],
                virtualKeys: "#control-s"
            },
            matrix: {
                physicalKeys: [["KeyM"]],
                virtualKeys: "#control-m"
            },
            incDepth: {
                physicalKeys: [["ArrowUp"]],
                virtualKeys: "#control-up"
            },
            decDepth: {
                physicalKeys: [["ArrowDown"]],
                virtualKeys: "#control-down"
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
function mapped(property, mapper) {
    const pos = [[0, 0]];
    return {
        getter: () => pos[0],
        setter: b => {
            pos[0] = b;
            property.setter(mapper(b));
        }
    };
}
//# sourceMappingURL=toy.js.map