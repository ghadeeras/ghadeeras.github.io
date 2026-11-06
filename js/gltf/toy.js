import { mat4, vec3 } from "aether";
import * as gear from "gear";
import * as dragging from "../utils/dragging.js";
import { Palette2D } from "../utils/palette.js";
import * as xr from "../utils/xr.js";
import { newViewFactory } from "./view.js";
import { xrCompatible } from "webgxx";
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
export async function init(wires = false) {
    const loop = await GLTFToy.loop(wires);
    loop.run();
}
class GLTFToy {
    constructor(models, view, xrSwitch) {
        this.models = models;
        this.view = view;
        this.xrSwitch = xrSwitch;
        this.modelNameElement = gear.required(document.getElementById("model-name"));
        this.statusElement = gear.required(document.getElementById("status"));
        this.cameraElement = gear.required(document.getElementById("camera"));
        this.modelSelectorElement = gear.required(document.getElementById("model-selector"));
        this.rotationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.RotationDragging.dragger(() => this.view.viewMatrix));
        this.translationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.TranslationDragging.dragger(() => this.view.viewMatrix));
        this.scaleDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.ScaleDragging.dragger(4));
        this.zoomDragging = gear.loops.draggingTarget(gear.property(this, "projectionAndViewMatrices"), dragging.ZoomDragging.dragger(2));
        this.colorDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "modelColor"), positionToColor), dragging.positionDragging);
        this.lightPositionDragging = gear.loops.draggingTarget(gear.property(this, "lightMatrix"), dragging.RotationDragging.dragger(() => mat4.scaling(1, 1, -1)));
        this.roughnessFactorDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "roughnessFactor"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.metallicFactorDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "metallicFactor"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this._perspectives = [];
        this._modelIndex = 0;
        this._cameraIndex = 0;
        this._model = null;
        this.xrSession = null;
        this.xrMatrix = mat4.from([
            1, 0, 0.0, 0,
            0, 1, 0.0, 0,
            0, 0, -0.5, 0,
            0, 0, 0.5, 1
        ]);
        const modelIndex = Math.abs(models.findIndex(([n, _]) => n === "DamagedHelmet"));
        models.forEach(([modelName, _], i) => {
            const option = new Option(modelName, modelName, i === modelIndex, i === modelIndex);
            this.modelSelectorElement.appendChild(option);
        });
        this.modelIndex = modelIndex;
        this.modelSelectorElement.onchange = () => {
            const modelIndex = models.findIndex(([modelName, _]) => modelName === this.modelSelectorElement.value);
            if (modelIndex >= 0) {
                this.modelIndex = modelIndex;
            }
        };
        this.view.modelColor = [1, 1, 1, 1];
        this.view.roughnessFactor = 1.0;
        this.view.metallicFactor = 1.0;
        this.lightMatrix = mat4.identity();
        if (xrSwitch && xrCompatible(this.view.device.wrapped)) {
            gear.required(document.getElementById("xr")).style.removeProperty("visibility");
        }
    }
    static async loop(wires) {
        const modelIndexResponse = await fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
        const models = (await modelIndexResponse.json())
            .map(entry => [entry.name, `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${entry.name}/glTF/${entry.variants.glTF}`]);
        models.unshift(["ScalarFieldIn", new URL("/models/ScalarFieldIn.gltf", window.location.href).href], ["ScalarField", new URL("/models/ScalarField.gltf", window.location.href).href], ["ScalarFieldOut", new URL("/models/ScalarFieldOut.gltf", window.location.href).href], ["SculptTorso", new URL("/models/SculptTorso.gltf", window.location.href).href]);
        const viewFactory = await newViewFactory("canvas", wires);
        const view = viewFactory();
        const xrSwitch = await xr.XRSwitch.create();
        return gear.loops.newLoop(new GLTFToy(models, view, xrSwitch), GLTFToy.descriptor);
    }
    inputWiring(inputs, outputs, controller) {
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
                roughnessFactor: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.roughnessFactorDragging },
                metallicFactor: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.metallicFactorDragging },
                skyRotation: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightPositionDragging },
                nextModel: { onPressed: () => this.modelIndex-- },
                previousModel: { onPressed: () => this.modelIndex++ },
                nextCamera: { onPressed: () => this.cameraIndex++ },
                previousCamera: { onPressed: () => this.cameraIndex-- },
                xr: { onPressed: () => this.toggleXR(controller) },
            }
        };
    }
    outputWiring() {
        return {
            onRender: () => {
                if (this.xrSession === null) {
                    this.view.draw();
                }
            },
            canvases: {
                scene: { onResize: () => this.view.resize() }
            }
        };
    }
    animate() {
    }
    get projectionAndViewMatrices() {
        return [this.view.projectionMatrix, this.view.viewMatrix];
    }
    set projectionAndViewMatrices([projectionMatrix, viewMatrix]) {
        this.view.projectionMatrix = projectionMatrix;
        this.view.viewMatrix = viewMatrix;
    }
    get projectionViewMatrix() {
        return mat4.mul(this.view.projectionMatrix, this.view.viewMatrix);
    }
    get modelIndex() {
        return this._modelIndex;
    }
    set modelIndex(i) {
        this._modelIndex = (i + this.models.length) % this.models.length;
        const [name, uri] = this.models[this._modelIndex];
        this.modelNameElement.innerText = name;
        this.modelSelectorElement.value = name;
        this.statusElement.innerText = "Loading Model ...";
        this.view.loadModel(uri)
            .then(model => {
            this._model = model;
            this.statusElement.innerText = "Rendering Model ...";
            this.cameraElement.innerText = `1 / ${model.scene.perspectives.length}`;
            this._perspectives = model.scene.perspectives;
            this._cameraIndex = 0;
        })
            .catch(reason => {
            console.error(reason);
            return this.statusElement.innerText = "Failed to load model!";
        });
    }
    get cameraIndex() {
        return this._cameraIndex;
    }
    set cameraIndex(i) {
        this._cameraIndex = (i + this._perspectives.length) % this._perspectives.length;
        const perspective = this._perspectives[this._cameraIndex];
        this.view.modelMatrix = perspective.modelMatrix;
        this.view.projectionMatrix = perspective.camera.matrix(this.view.aspectRatio, this.view.focalLength);
        this.view.viewMatrix = perspective.matrix;
        this.cameraElement.innerText = `${this._cameraIndex + 1} / ${this._perspectives.length}`;
    }
    get lightMatrix() {
        return mat4.rotationBetween([0, 0, 1], vec3.from(this.view.lightPosition));
    }
    set lightMatrix(m) {
        this.view.lightPosition = m[2];
    }
    async toggleXR(controller) {
        if (this.xrSwitch !== null) {
            if (this.xrSession !== null) {
                this.xrSession.end();
                this.xrSession = null;
            }
            else {
                this.xrSession = await this.xrTurnOn(this.xrSwitch, controller, this.view.device.wrapped);
                this.xrStartAnimation(this.xrSession, controller);
            }
        }
    }
    async xrTurnOn(xrSwitch, controller, device) {
        const snapshot = this.snapshot(controller);
        const listeners = {
            end: () => this.restore(snapshot, controller),
            select: e => this.modelIndex += e.inputSource.handedness == "left" ? +1 : -1,
            squeeze: e => this.modelIndex += e.inputSource.handedness == "right" ? +1 : -1,
        };
        controller.animationPaused = true;
        return await xrSwitch.turnOn(["local", "viewer"], device, listeners);
    }
    xrStartAnimation(xrSession, controller) {
        controller.animationPaused = true;
        this.cameraIndex = -1;
        xrSession.startAnimation(frame => this.xrRender(frame));
    }
    xrRender(frame) {
        const projectionMat = mat4.mul(this.xrMatrix, mat4.from(frame.view.projectionMatrix));
        const viewMat = mat4.from(frame.view.transform.inverse.matrix);
        const modelMat = this._model ? this._model.scene.matrix : mat4.identity();
        const poses = [...frame.wrapped.session.inputSources]
            .sort((s1, s2) => s1.handedness < s2.handedness ? 1 : s1.handedness == s2.handedness ? 0 : -1)
            .map(s => frame.wrapped.getPose(s.targetRaySpace, frame.space))
            .map((p, i) => p !== undefined
            ? mat4.from(p.transform.matrix)
            : mat4.translation([0, 0, i === 0 ? -2 : 100]));
        const modelPose = poses[0] !== undefined
            ? mat4.mul(poses[0], mat4.scaling(0.125, 0.125, 0.125))
            : mat4.translation([0, 0, -2]);
        const lightPose = poses[1] !== undefined
            ? mat4.mul(viewMat, poses[1])
            : mat4.translation([0, 0, 100]);
        this.view.projectionMatrix = projectionMat;
        this.view.viewMatrix = viewMat;
        this.view.modelMatrix = mat4.mul(modelPose, modelMat);
        this.view.lightPosition = lightPose[3];
        this.view.draw(frame.viewport, frame.viewerPose.views.indexOf(frame.view));
    }
    snapshot(controller) {
        return {
            projectionMat: this.view.projectionMatrix,
            viewMat: this.view.viewMatrix,
            modelMat: this.view.modelMatrix,
            lightPosition: this.view.lightPosition,
            cameraIndex: this.cameraIndex,
            animationPaused: controller.animationPaused
        };
    }
    restore(snapshot, controller) {
        this.view.projectionMatrix = snapshot.projectionMat;
        this.view.viewMatrix = snapshot.viewMat;
        this.view.modelMatrix = snapshot.modelMat;
        this.view.lightPosition = snapshot.lightPosition;
        this.cameraIndex = snapshot.cameraIndex;
        controller.animationPaused = snapshot.animationPaused;
        this.view.resize();
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
            roughnessFactor: {
                physicalKeys: [["KeyH"]],
                virtualKeys: "#control-h",
            },
            metallicFactor: {
                physicalKeys: [["KeyT"]],
                virtualKeys: "#control-t",
            },
            skyRotation: {
                physicalKeys: [["KeyK"]],
                virtualKeys: "#control-k",
            },
            nextModel: {
                physicalKeys: [["ArrowLeft"]],
                virtualKeys: "#control-left",
            },
            previousModel: {
                physicalKeys: [["ArrowRight"]],
                virtualKeys: "#control-right",
            },
            nextCamera: {
                physicalKeys: [["ArrowUp"]],
                virtualKeys: "#control-up",
            },
            previousCamera: {
                physicalKeys: [["ArrowDown"]],
                virtualKeys: "#control-down",
            },
            xr: {
                physicalKeys: [["KeyX"]],
                virtualKeys: "#control-xr",
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
const redVec = [-1, -1];
const greenVec = [0, 1];
const blueVec = [1, -1];
const palette = new Palette2D(redVec, greenVec, blueVec);
function positionToColor(vec) {
    const [red, green, blue] = palette.toColor(vec);
    return [...vec3.scale([red, green, blue], 1 / Math.max(red, green, blue)), 1.0];
}
//# sourceMappingURL=toy.js.map