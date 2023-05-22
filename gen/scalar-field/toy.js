var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether, gear } from "/gen/libs.js";
import { gltf } from "../djee/index.js";
import * as v from "./view.js";
import * as dragging from "../utils/dragging.js";
export const huds = {
    "monitor": "monitor-button"
};
export function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const toy = yield Toy.create();
        const loop = gear.loops.newLoop(toy, Toy.descriptor);
        loop.run();
    });
}
class Toy {
    constructor(view, scalarFieldInstance) {
        this.view = view;
        this.scalarFieldInstance = scalarFieldInstance;
        this.contourTarget = gear.loops.draggingTarget(mapped(gear.property(this, "contourValue"), ([_, y]) => y), dragging.positionDragging);
        this.rotationDragging = gear.loops.draggingTarget(gear.property(this, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, 4));
        this.focalLengthDragging = gear.loops.draggingTarget(gear.property(this.view, "focalLength"), dragging.RatioDragging.dragger());
        this.lightPositionDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightPosition"), this.toLightPosition.bind(this)), dragging.positionDragging);
        this.lightRadiusDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightRadius"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.shininessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.fogginessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "fogginess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.lodElement = gear.required(document.getElementById("lod"));
        this.meshComputer = new gear.DeferredComputation(() => this.view.setMesh(WebGL2RenderingContext.TRIANGLES, this.scalarFieldInstance.vertices));
        this._field = 0;
        view.matView = aether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0]);
        view.focalLength = Math.pow(2, 1.5);
        this.modelMatrix = aether.mat4.identity();
        this.contourValue = 0.01;
        this.resolution = 64;
        this.field = 0;
    }
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const scalarFieldModule = yield aether.loadScalarFieldModule();
            const scalarFieldInstance = scalarFieldModule.newInstance();
            const view = yield v.newView(Toy.descriptor.output.canvases.scene.element);
            return new Toy(view, scalarFieldInstance);
        });
    }
    inputWiring(inputs) {
        return {
            pointers: {
                canvas: {
                    defaultDraggingTarget: this.rotationDragging
                }
            },
            keys: {
                contour: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.contourTarget },
                rotation: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.rotationDragging },
                zoom: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.focalLengthDragging },
                lightDirection: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightPositionDragging },
                lightRadius: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightRadiusDragging },
                shininess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.shininessDragging },
                fogginess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.fogginessDragging },
                decLOD: { onPressed: () => this.resolution -= 8 },
                incLOD: { onPressed: () => this.resolution += 8 },
                prevField: { onPressed: () => this.field -= 1 },
                nextField: { onPressed: () => this.field += 1 },
                export: { onPressed: () => this.saveModel() },
            }
        };
    }
    outputWiring() {
        return {
            onRender: () => this.view.render(),
            canvases: {
                scene: {
                    onResize: () => this.view.resize()
                }
            }
        };
    }
    animate() {
    }
    get projectionViewMatrix() {
        return aether.mat4.mul(this.view.matProjection, this.view.matView);
    }
    get modelMatrix() {
        return this.view.matPositions;
    }
    set modelMatrix(m) {
        this.view.setMatModel(m, m);
    }
    get contourValue() {
        return this.scalarFieldInstance.contourValue;
    }
    set contourValue(v) {
        this.scalarFieldInstance.contourValue = v;
        this.view.color = this.fieldColor(v);
        this.meshComputer.perform();
    }
    get resolution() {
        return this.scalarFieldInstance.resolution;
    }
    set resolution(r) {
        if (r > 96 || r < 32) {
            return;
        }
        this.scalarFieldInstance.resolution = r;
        this.lodElement.innerText = r.toString();
        this.meshComputer.perform();
    }
    get field() {
        return this._field;
    }
    set field(f) {
        if (f < 0 || f >= fields.length) {
            return;
        }
        this._field = f;
        this.scalarFieldInstance.sampler = fields[f];
        this.meshComputer.perform();
    }
    fieldColor(contourValue = this.scalarFieldInstance.contourValue) {
        return contourValue > 0 ?
            [1, 0, (1 - contourValue) / (1 + contourValue), 1] :
            [1 - (1 + contourValue) / (1 - contourValue), 1, 0, 1];
    }
    saveModel() {
        const model = gltf.createModel("ScalarField", this.scalarFieldInstance.vertices);
        const canvas = document.getElementById("canvas-gl");
        gear.save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', 'ScalarField.gltf');
        gear.save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', 'ScalarField.bin');
        gear.save(canvas.toDataURL("image/png"), 'image/png', 'ScalarField.png');
    }
    toLightPosition(pos) {
        const unclampedP = aether.vec2.mul(pos, [this.view.canvas.width / this.view.canvas.height, 1]);
        const clampedP = aether.vec2.length(unclampedP) > 1 ? aether.vec2.unit(unclampedP) : unclampedP;
        const [x, y] = aether.vec2.scale(clampedP, Math.PI / 2);
        const p = aether.vec3.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y));
        return [...p, 1];
    }
}
Toy.descriptor = {
    input: {
        pointers: {
            canvas: {
                element: "canvas",
            }
        },
        keys: {
            contour: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-c",
            },
            rotation: {
                physicalKeys: [["KeyR"]],
                virtualKeys: "#control-r",
            },
            zoom: {
                physicalKeys: [["KeyZ"]],
                virtualKeys: "#control-z",
            },
            shininess: {
                physicalKeys: [["KeyH"]],
                virtualKeys: "#control-h",
            },
            fogginess: {
                physicalKeys: [["KeyF"]],
                virtualKeys: "#control-f",
            },
            lightDirection: {
                physicalKeys: [["KeyD"]],
                virtualKeys: "#control-d",
            },
            lightRadius: {
                physicalKeys: [["KeyL"]],
                virtualKeys: "#control-l",
            },
            export: {
                physicalKeys: [["KeyX"]],
                virtualKeys: "#control-x",
            },
            incLOD: {
                physicalKeys: [["ArrowUp"]],
                virtualKeys: "#control-up",
            },
            decLOD: {
                physicalKeys: [["ArrowDown"]],
                virtualKeys: "#control-down",
            },
            prevField: {
                physicalKeys: [["ArrowLeft"]],
                virtualKeys: "#control-left",
            },
            nextField: {
                physicalKeys: [["ArrowRight"]],
                virtualKeys: "#control-right",
            },
        }
    },
    output: {
        canvases: {
            scene: {
                element: "canvas"
            }
        },
        fps: {
            element: "fps-watch"
        },
        styling: {
            pressedButton: "pressed"
        },
    },
};
const twoPi = 2 * Math.PI;
const fields = [xyz, envelopedCosine];
function xyz(x, y, z) {
    return [
        y * z,
        z * x,
        x * y,
        x * y * z
    ];
}
function envelopedCosine(x, y, z) {
    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
        const piX2 = Math.PI * x2;
        const piY2 = Math.PI * y2;
        const piZ2 = Math.PI * z2;
        const envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8;
        const piX = Math.PI * x;
        const piY = Math.PI * y;
        const piZ = Math.PI * z;
        const value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ);
        const dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4;
        const dValueDX = -twoPi * Math.sin(2 * piX);
        const dValueDY = -twoPi * Math.sin(2 * piY);
        const dValueDZ = -twoPi * Math.sin(2 * piZ);
        return [
            dEnvelopeDX * value + envelope * dValueDX,
            dEnvelopeDY * value + envelope * dValueDY,
            dEnvelopeDZ * value + envelope * dValueDZ,
            envelope * value / 3
        ];
    }
    else {
        return [0, 0, 0, 0];
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