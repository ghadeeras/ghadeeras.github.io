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
import * as dragging from "../utils/dragging.js";
import { newViewFactory } from "./view.js";
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gltf";
export const huds = {
    "monitor": "monitor-button"
};
export function wires() {
    return {
        gitHubRepo,
        huds,
        video: null,
        init: () => init(true)
    };
}
export function init(wires = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const loop = yield GLTFToy.loop(wires);
        loop.run();
    });
}
class GLTFToy {
    constructor(models, view) {
        this.models = models;
        this.view = view;
        this.modelNameElement = gear.loops.required(document.getElementById("model-name"));
        this.statusElement = gear.loops.required(document.getElementById("status"));
        this.rotationDragging = gear.loops.draggingTarget(gear.loops.property(this.view, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, 4));
        this.translationDragging = gear.loops.draggingTarget(gear.loops.property(this.view, "modelMatrix"), dragging.TranslationDragging.dragger(() => this.projectionViewMatrix, 4));
        this.scaleDragging = gear.loops.draggingTarget(gear.loops.property(this.view, "modelMatrix"), dragging.ScaleDragging.dragger(4));
        this.zoomDragging = gear.loops.draggingTarget(gear.loops.property(this, "projectionAndViewMatrices"), dragging.ZoomDragging.dragger(2));
        this.colorDragging = gear.loops.draggingTarget(mapped(gear.loops.property(this.view, "modelColor"), positionToColor), dragging.positionDragging);
        this.lightPositionDragging = gear.loops.draggingTarget(mapped(gear.loops.property(this.view, "lightPosition"), this.toLightPosition.bind(this)), dragging.positionDragging);
        this.lightRadiusDragging = gear.loops.draggingTarget(mapped(gear.loops.property(this.view, "lightRadius"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.shininessDragging = gear.loops.draggingTarget(mapped(gear.loops.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.fogginessDragging = gear.loops.draggingTarget(mapped(gear.loops.property(this.view, "fogginess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this._modelIndex = 0;
        this.modelIndex = 1;
        this.view.modelColor = [0.8, 0.8, 0.8, 1];
        this.view.shininess = 1;
        this.view.fogginess = 0;
        this.view.lightPosition = this.toLightPosition([-0.5, 0.5]);
        this.view.lightRadius = 0.005;
    }
    static loop(wires) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
            const models = (yield modelIndexResponse.json())
                .map(entry => [entry.name, `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${entry.name}/glTF/${entry.variants.glTF}`]);
            models.unshift(["ScalarFieldIn", new URL("/models/ScalarFieldIn.gltf", window.location.href).href], ["ScalarField", new URL("/models/ScalarField.gltf", window.location.href).href], ["ScalarFieldOut", new URL("/models/ScalarFieldOut.gltf", window.location.href).href], ["SculptTorso", new URL("/models/SculptTorso.gltf", window.location.href).href]);
            const viewFactory = yield newViewFactory("canvas", wires);
            const view = viewFactory();
            return gear.loops.newLoop(new GLTFToy(models, view), GLTFToy.descriptor);
        });
    }
    inputWiring(inputs) {
        return {
            pointers: {
                canvas: { defaultDraggingTarget: this.rotationDragging }
            },
            keys: {
                move: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.translationDragging },
                rotate: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.rotationDragging },
                scale: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.scaleDragging },
                zoom: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.zoomDragging },
                color: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.colorDragging },
                shininess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.shininessDragging },
                lightDirection: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightPositionDragging },
                lightRadius: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightRadiusDragging },
                fogginess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.fogginessDragging },
                nextModel: { onPressed: () => this.modelIndex-- },
                previousModel: { onPressed: () => this.modelIndex++ },
            }
        };
    }
    outputWiring() {
        return {
            onRender: () => this.view.draw(),
            canvases: {
                scene: { onResize: () => this.view.resize() }
            }
        };
    }
    animate() {
    }
    toLightPosition(pos) {
        const clampedP = aether.vec2.length(pos) > 1 ? aether.vec2.unit(pos) : pos;
        const [x, y] = aether.vec2.of(clampedP[0] * Math.PI / 2, clampedP[1] * Math.PI / 2);
        const p = aether.vec3.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y));
        return aether.vec3.add(aether.vec3.from(this.view.viewMatrix[3]), p);
    }
    get projectionAndViewMatrices() {
        return [this.view.projectionMatrix, this.view.viewMatrix];
    }
    set projectionAndViewMatrices([projectionMatrix, viewMatrix]) {
        this.view.projectionMatrix = projectionMatrix;
        this.view.viewMatrix = viewMatrix;
    }
    get projectionViewMatrix() {
        return aether.mat4.mul(this.view.projectionMatrix, this.view.viewMatrix);
    }
    get modelIndex() {
        return this._modelIndex;
    }
    set modelIndex(i) {
        this._modelIndex = i % this.models.length;
        const [name, uri] = this.models[this._modelIndex];
        this.modelNameElement.innerText = name;
        this.view.modelMatrix = aether.mat4.identity();
        this.statusElement.innerText = "Loading Model ...";
        this.view.loadModel(uri)
            .then(() => this.statusElement.innerText = "Rendering Model ...")
            .catch(reason => {
            console.error(reason);
            return this.statusElement.innerText = "Failed to load model!";
        });
    }
}
GLTFToy.descriptor = {
    input: {
        pointers: {
            canvas: {
                element: "canvas"
            }
        },
        keys: {
            move: {
                physicalKeys: [["KeyM"]],
                virtualKeys: "#control-m",
            },
            rotate: {
                physicalKeys: [["KeyR"]],
                virtualKeys: "#control-r",
            },
            scale: {
                physicalKeys: [["KeyS"]],
                virtualKeys: "#control-s",
            },
            zoom: {
                physicalKeys: [["KeyZ"]],
                virtualKeys: "#control-z",
            },
            color: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-c",
            },
            shininess: {
                physicalKeys: [["KeyH"]],
                virtualKeys: "#control-h",
            },
            lightDirection: {
                physicalKeys: [["KeyD"]],
                virtualKeys: "#control-d",
            },
            lightRadius: {
                physicalKeys: [["KeyL"]],
                virtualKeys: "#control-l",
            },
            fogginess: {
                physicalKeys: [["KeyF"]],
                virtualKeys: "#control-f",
            },
            nextModel: {
                physicalKeys: [["ArrowLeft"]],
                virtualKeys: "#control-left",
            },
            previousModel: {
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
const third = 2 * Math.PI / 3;
const redVec = [1, 0];
const greenVec = [Math.cos(third), Math.sin(third)];
const blueVec = [Math.cos(2 * third), Math.sin(2 * third)];
function positionToColor(vec) {
    const red = Math.min(2, 1 + aether.vec2.dot(vec, redVec)) / 2;
    const green = Math.min(2, 1 + aether.vec2.dot(vec, greenVec)) / 2;
    const blue = Math.min(2, 1 + aether.vec2.dot(vec, blueVec)) / 2;
    return [red, green, blue, 1.0];
}
//# sourceMappingURL=toy.js.map