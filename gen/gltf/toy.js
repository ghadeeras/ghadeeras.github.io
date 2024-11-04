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
import * as xr from "../utils/xr.js";
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
export function init() {
    return __awaiter(this, arguments, void 0, function* (wires = false) {
        const loop = yield GLTFToy.loop(wires);
        loop.run();
    });
}
class GLTFToy {
    constructor(models, view, xrSwitch) {
        this.models = models;
        this.view = view;
        this.xrSwitch = xrSwitch;
        this.modelNameElement = gear.required(document.getElementById("model-name"));
        this.statusElement = gear.required(document.getElementById("status"));
        this.cameraElement = gear.required(document.getElementById("camera"));
        this.rotationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, -4));
        this.translationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.TranslationDragging.dragger(() => this.projectionViewMatrix, 4));
        this.scaleDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.ScaleDragging.dragger(4));
        this.zoomDragging = gear.loops.draggingTarget(gear.property(this, "projectionAndViewMatrices"), dragging.ZoomDragging.dragger(2));
        this.colorDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "modelColor"), positionToColor), dragging.positionDragging);
        this.lightPositionDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightPosition"), this.toLightPosition.bind(this)), dragging.positionDragging);
        this.lightRadiusDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightRadius"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.shininessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this.fogginessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "fogginess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging);
        this._perspectives = [];
        this._modelIndex = 0;
        this._cameraIndex = 0;
        this._model = null;
        this.xrSession = null;
        this.modelIndex = 1;
        this.view.modelColor = [0.8, 0.8, 0.8, 1];
        this.view.shininess = 1;
        this.view.fogginess = 0;
        this.view.lightPosition = this.toLightPosition([-0.5, 0.5]);
        this.view.lightRadius = 0.005;
        if (xrSwitch && this.view.xrContext !== null) {
            gear.required(document.getElementById("xr")).style.removeProperty("visibility");
        }
    }
    static loop(wires) {
        return __awaiter(this, void 0, void 0, function* () {
            const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
            const models = (yield modelIndexResponse.json())
                .map(entry => [entry.name, `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${entry.name}/glTF/${entry.variants.glTF}`]);
            models.unshift(["ScalarFieldIn", new URL("/models/ScalarFieldIn.gltf", window.location.href).href], ["ScalarField", new URL("/models/ScalarField.gltf", window.location.href).href], ["ScalarFieldOut", new URL("/models/ScalarFieldOut.gltf", window.location.href).href], ["SculptTorso", new URL("/models/SculptTorso.gltf", window.location.href).href]);
            const viewFactory = yield newViewFactory("canvas", wires);
            const view = viewFactory();
            const xrSwitch = yield xr.XRSwitch.create();
            return gear.loops.newLoop(new GLTFToy(models, view, xrSwitch), GLTFToy.descriptor);
        });
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
                shininess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.shininessDragging },
                lightDirection: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightPositionDragging },
                lightRadius: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightRadiusDragging },
                fogginess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.fogginessDragging },
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
        return p;
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
        this._modelIndex = (i + this.models.length) % this.models.length;
        const [name, uri] = this.models[this._modelIndex];
        this.modelNameElement.innerText = name;
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
    toggleXR(controller) {
        return __awaiter(this, void 0, void 0, function* () {
            const gl = this.view.xrContext;
            if (this.xrSwitch !== null) {
                if (this.xrSession) {
                    this.xrSession.end();
                    this.xrSession = null;
                }
                else if (gl) {
                    this.xrSession = yield this.xrTurnOn(this.xrSwitch, controller, gl);
                    this.xrStartAnimation(this.xrSession, controller);
                }
            }
        });
    }
    xrTurnOn(xrSwitch, controller, gl) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = this.snapshot(controller);
            const listeners = {
                end: () => this.restore(snapshot, controller),
                select: e => this.modelIndex += e.inputSource.handedness == "left" ? +1 : -1,
                squeeze: e => this.modelIndex += e.inputSource.handedness == "right" ? +1 : -1,
            };
            return yield xrSwitch.turnOn(["local", "viewer"], gl, listeners);
        });
    }
    xrStartAnimation(xrSession, controller) {
        controller.animationPaused = true;
        this.cameraIndex = -1;
        xrSession.startAnimation(frame => this.xrRender(frame));
    }
    xrRender(frame) {
        const projectionMat = aether.mat4.from(frame.view.projectionMatrix);
        projectionMat.forEach(c => c[2] = -c[2]); // reverse Z
        this.view.projectionMatrix = projectionMat;
        this.view.viewMatrix = aether.mat4.from(frame.view.transform.inverse.matrix);
        const inputSource = [...frame.frame.session.inputSources]
            .sort((s1, s2) => s1.handedness < s2.handedness ? 1 : s1.handedness == s2.handedness ? 0 : -1)
            .find(s => s.gripSpace);
        const pose = inputSource
            ? inputSource.gripSpace
                ? frame.frame.getPose(inputSource.gripSpace, frame.space)
                : undefined
            : undefined;
        this.view.modelMatrix = aether.mat4.mul(pose
            ? aether.mat4.mul(aether.mat4.from(pose.transform.matrix), aether.mat4.scaling(0.125, 0.125, 0.125))
            : aether.mat4.translation([0, 0, -4]), this._model ? this._model.scene.matrix : aether.mat4.identity());
        this.view.draw(frame.viewerPose.views.indexOf(frame.view));
    }
    snapshot(controller) {
        return {
            projectionMat: this.view.projectionMatrix,
            viewMat: this.view.viewMatrix,
            modelMat: this.view.modelMatrix,
            cameraIndex: this.cameraIndex,
            animationPaused: controller.animationPaused
        };
    }
    restore(snapshot, controller) {
        this.view.projectionMatrix = snapshot.projectionMat;
        this.view.viewMatrix = snapshot.viewMat;
        this.view.modelMatrix = snapshot.modelMat;
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