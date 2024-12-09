import * as aether from "aether"
import * as gear from "gear"
import * as dragging from "../utils/dragging.js";
import { newViewFactory, View } from "./view.js";
import { Toy } from "../initializer.js";
import { gltf } from "../djee/index.js";
import * as xr from "../utils/xr.js";

type ModelIndexEntry = {
    name: string,
    screenshot: string,
    variants: {
      glTF: string,
      "glTF-Binary": string,
      "glTF-Draco": string,
      "glTF-Embedded": string
    }
}

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gltf"
export const huds = {
    "monitor": "monitor-button"
}

export function wires(): Toy {
    return {
        gitHubRepo,
        huds,
        video: null,
        init: () => init(true)
    }
}

export async function init(wires: boolean = false) {
    const loop = await GLTFToy.loop(wires)
    loop.run()
}

type ToyDescriptor = typeof GLTFToy.descriptor

type Snapshot = {
    projectionMat: aether.Mat4
    viewMat: aether.Mat4
    modelMat: aether.Mat4
    cameraIndex: number;
    animationPaused: boolean;
};

class GLTFToy implements gear.loops.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
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
    } satisfies gear.loops.LoopDescriptor
    
    private readonly modelNameElement = gear.required(document.getElementById("model-name"))
    private readonly statusElement = gear.required(document.getElementById("status"))
    private readonly cameraElement = gear.required(document.getElementById("camera"))

    readonly rotationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, -4))
    readonly translationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.TranslationDragging.dragger(() => this.projectionViewMatrix, 4))
    readonly scaleDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.ScaleDragging.dragger(4))
    readonly zoomDragging = gear.loops.draggingTarget(gear.property(this, "projectionAndViewMatrices"), dragging.ZoomDragging.dragger(2))
    readonly colorDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "modelColor"), positionToColor), dragging.positionDragging)
    readonly lightPositionDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightPosition"), this.toLightPosition.bind(this)), dragging.positionDragging)
    readonly lightRadiusDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightRadius"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly shininessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly fogginessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "fogginess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)

    private _perspectives: gltf.graph.Perspective[] = []
    private _modelIndex = 0
    private _cameraIndex = 0
    private _model: gltf.graph.Model | null = null

    private xrSession: xr.XRealitySession | null = null

    private constructor(private models: [string, string][], private view: View, private xrSwitch: xr.XRSwitch | null) {
        this.modelIndex = 1
        this.view.modelColor = [0.8, 0.8, 0.8, 1]
        this.view.shininess = 1
        this.view.fogginess = 0
        this.view.lightPosition = this.toLightPosition([-0.5, 0.5])
        this.view.lightRadius = 0.005
        if (xrSwitch && this.view.xrContext !== null) {
            gear.required(document.getElementById("xr")).style.removeProperty("visibility")
        }
    }

    static async loop(wires: boolean): Promise<gear.loops.Loop> {
        const modelIndexResponse = await fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json")
        const models: [string, string][] = (await modelIndexResponse.json() as ModelIndexEntry[])
            .map(entry => [entry.name, `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${entry.name}/glTF/${entry.variants.glTF}`])
        models.unshift(
            ["ScalarFieldIn", new URL("/models/ScalarFieldIn.gltf", window.location.href).href],
            ["ScalarField", new URL("/models/ScalarField.gltf", window.location.href).href],
            ["ScalarFieldOut", new URL("/models/ScalarFieldOut.gltf", window.location.href).href],
            ["SculptTorso", new URL("/models/SculptTorso.gltf", window.location.href).href],
        )
    
        const viewFactory = await newViewFactory("canvas", wires)
        const view = viewFactory()
        const xrSwitch = await xr.XRSwitch.create()
    
        return gear.loops.newLoop(new GLTFToy(models, view, xrSwitch), GLTFToy.descriptor)
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>, outputs: gear.loops.LoopOutputs<ToyDescriptor>, controller: gear.loops.LoopController): gear.loops.LoopInputWiring<ToyDescriptor> {
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
        }
    }

    outputWiring(): gear.loops.LoopOutputWiring<ToyDescriptor> {
        return {
            onRender: () => this.view.draw(),
            canvases: {
                scene: { onResize: () => this.view.resize() }
            }
        }
        
    }

    animate(): void {
    }

    toLightPosition(pos: gear.PointerPosition) {
        const clampedP = aether.vec2.length(pos) > 1 ? aether.vec2.unit(pos) : pos
        const [x, y] = aether.vec2.of(clampedP[0] * Math.PI / 2, clampedP[1] * Math.PI / 2)
        const p = aether.vec3.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y));
        return p;
    }

    get projectionAndViewMatrices(): [aether.Mat4, aether.Mat4] {
        return [this.view.projectionMatrix, this.view.viewMatrix];
    }

    set projectionAndViewMatrices([projectionMatrix, viewMatrix] : [aether.Mat4, aether.Mat4]) {
        this.view.projectionMatrix = projectionMatrix
        this.view.viewMatrix = viewMatrix
    }

    get projectionViewMatrix(): aether.Mat4 {
        return aether.mat4.mul(this.view.projectionMatrix, this.view.viewMatrix);
    }

    get modelIndex() {
        return this._modelIndex
    }

    set modelIndex(i: number) {
        this._modelIndex = (i + this.models.length) % this.models.length
        const [name, uri] = this.models[this._modelIndex]
        this.modelNameElement.innerText = name
        this.statusElement.innerText = "Loading Model ..."
        this.view.loadModel(uri)
            .then(model => {
                this._model = model
                this.statusElement.innerText = "Rendering Model ..."
                this.cameraElement.innerText = `1 / ${model.scene.perspectives.length}`
                this._perspectives = model.scene.perspectives
                this._cameraIndex = 0
            })
            .catch(reason => {
                console.error(reason)
                return this.statusElement.innerText = "Failed to load model!"
            })
    }
    
    get cameraIndex() {
        return this._cameraIndex
    }

    set cameraIndex(i: number) {
        this._cameraIndex = (i + this._perspectives.length) % this._perspectives.length
        const perspective = this._perspectives[this._cameraIndex]
        this.view.modelMatrix = perspective.modelMatrix
        this.view.projectionMatrix = perspective.camera.matrix(this.view.aspectRatio, this.view.focalLength)
        this.view.viewMatrix = perspective.matrix
        this.cameraElement.innerText = `${this._cameraIndex + 1} / ${this._perspectives.length}`
    }
    
    private async toggleXR(controller: gear.loops.LoopController) {
        const gl = this.view.xrContext
        if (this.xrSwitch !== null) {
            if (this.xrSession) {
                this.xrSession.end()
                this.xrSession = null
            } else if (gl) {
                this.xrSession = await this.xrTurnOn(this.xrSwitch, controller, gl);
                this.xrStartAnimation(this.xrSession, controller);
            }
        }
    }

    private async xrTurnOn(xrSwitch: xr.XRSwitch, controller: gear.loops.LoopController, gl: WebGL2RenderingContext) {
        const snapshot = this.snapshot(controller);
        const listeners: xr.XRealitySessionListeners = {
            end: () => this.restore(snapshot, controller),
            select: e => this.modelIndex += e.inputSource.handedness == "left" ? +1 : -1,
            squeeze: e => this.modelIndex += e.inputSource.handedness == "right" ? +1 : -1,
        };
        return await xrSwitch.turnOn(["local", "viewer"], gl, listeners);
    }

    private xrStartAnimation(xrSession: xr.XRealitySession, controller: gear.loops.LoopController) {
        controller.animationPaused = true;
        this.cameraIndex = -1;
        xrSession.startAnimation(frame => this.xrRender(frame));
    }

    private xrRender(frame: xr.XRealityFrame) {
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
        this.view.modelMatrix = aether.mat4.mul(
            pose
                ? aether.mat4.mul(aether.mat4.from(pose.transform.matrix), aether.mat4.scaling(0.125, 0.125, 0.125))
                : aether.mat4.translation([0, 0, -4]),
            this._model ? this._model.scene.matrix : aether.mat4.identity()
        );
        this.view.draw(frame.viewerPose.views.indexOf(frame.view));
    }

    private snapshot(controller: gear.loops.LoopController) {
        return {
            projectionMat: this.view.projectionMatrix,
            viewMat: this.view.viewMatrix,
            modelMat: this.view.modelMatrix,
            cameraIndex: this.cameraIndex,
            animationPaused: controller.animationPaused
        };
    }

    private restore(snapshot: Snapshot, controller: gear.loops.LoopController) {
        this.view.projectionMatrix = snapshot.projectionMat;
        this.view.viewMatrix = snapshot.viewMat;
        this.view.modelMatrix = snapshot.modelMat;
        this.cameraIndex = snapshot.cameraIndex;
        controller.animationPaused = snapshot.animationPaused;
        this.view.resize()
    }

}

function mapped<A>(property: gear.Property<A>, mapper: gear.Mapper<gear.PointerPosition, A>): gear.Property<gear.PointerPosition> {
    const pos: [gear.PointerPosition] = [[0, 0]]
    return {
        getter: () => pos[0],
        setter: b => {
            pos[0] = b
            property.setter(mapper(b))
        }
    }
}

const third = 2 * Math.PI / 3
const redVec: aether.Vec<2> = [1, 0];
const greenVec: aether.Vec<2> = [Math.cos(third), Math.sin(third)];
const blueVec: aether.Vec<2> = [Math.cos(2 * third), Math.sin(2 * third)];

function positionToColor(vec: gear.PointerPosition): aether.Vec4 {
    const red = Math.min(2, 1 + aether.vec2.dot(vec, redVec)) / 2;
    const green = Math.min(2, 1 + aether.vec2.dot(vec, greenVec)) / 2;
    const blue = Math.min(2, 1 + aether.vec2.dot(vec, blueVec)) / 2;
    return [red, green, blue, 1.0];
}
