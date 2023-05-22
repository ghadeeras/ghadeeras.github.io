var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from "../djee/gpu/index.js";
import * as gear from "/gear/latest/index.js";
import * as gearx from "../utils/gear.js";
import * as dragging from "../utils/dragging.js";
import { FieldRenderer } from "./renderer.js";
import { FieldSampler } from "./sampler.js";
import { aether } from "../libs.js";
export const huds = {
    "monitor": "monitor-button"
};
export function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const toy = yield Toy.create();
        const loop = gearx.newLoop(toy, Toy.descriptor);
        loop.run();
    });
}
class Toy {
    constructor(canvas, fieldRenderer, fieldSampler) {
        this.canvas = canvas;
        this.fieldRenderer = fieldRenderer;
        this.fieldSampler = fieldSampler;
        this.contourTarget = gearx.draggingTarget(mapped(gearx.property(this.fieldRenderer, "contourValue"), ([_, y]) => y), dragging.positionDragging);
        this.rotationDragging = gearx.draggingTarget(gearx.property(this.fieldRenderer, "modelMatrix"), dragging.RotationDragging.dragger(() => this.fieldRenderer.projectionViewMatrix, 4));
        this.matrixDragging = gearx.draggingTarget(gearx.property(this, "matrix"), dragging.RotationDragging.dragger(() => aether.mat4.identity()));
        this.scaleDragging = gearx.draggingTarget(gearx.property(this, "scale"), dragging.RatioDragging.dragger(Math.SQRT1_2, Math.SQRT2, 0.5));
        this.speeds = [[0, 0], [0, 0], [0, 0]];
        this.resampling = new gear.DeferredComputation(() => this.fieldSampler.sample());
        this.lodElement = gearx.required(document.getElementById("lod"));
        this.changeDepth(0);
    }
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const device = yield gpuDevice();
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element);
            const sampler = yield FieldSampler.create(device);
            const renderer = yield FieldRenderer.create(sampler.fieldTexture, canvas);
            return new Toy(canvas, renderer, sampler);
        });
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
    inputWiring(inputs) {
        const v = 0.01;
        return {
            keys: {
                contour: { onPressed: () => inputs.pointers.primary.draggingTarget = this.contourTarget },
                rotation: { onPressed: () => inputs.pointers.primary.draggingTarget = this.rotationDragging },
                matrix: { onPressed: () => inputs.pointers.primary.draggingTarget = this.matrixDragging },
                scale: { onPressed: () => inputs.pointers.primary.draggingTarget = this.scaleDragging },
                incDepth: { onPressed: () => this.changeDepth(+1) },
                decDepth: { onPressed: () => this.changeDepth(-1) },
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
function gpuDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const gpuStatus = gearx.required(document.getElementById("gpu-status"));
        try {
            const device = yield gpu.Device.instance();
            gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}";
            return device;
        }
        catch (e) {
            gpuStatus.innerHTML = "\u{1F62D} Not Supported!";
            throw e;
        }
    });
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