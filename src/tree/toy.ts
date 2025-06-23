import * as aether from "aether"
import * as gear from "gear"
import * as dragging from "../utils/dragging.js";
import { view, View } from "./view.js";
import { MatricesGenerator } from "./matgen.js";

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/tree";
export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const loop = await TreeToy.loop()
    loop.run()
}

type ToyDescriptor = typeof TreeToy.descriptor

class TreeToy implements gear.loops.LoopLogic<ToyDescriptor> {

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
                fogginess: {
                    physicalKeys: [["KeyF"]],
                    virtualKeys: "#control-f",
                },
                twist: {
                    physicalKeys: [["KeyT"]],
                    virtualKeys: "#control-t",
                },
                angle: {
                    physicalKeys: [["KeyA"]],
                    virtualKeys: "#control-a",
                },
                up: {
                    physicalKeys: [["ArrowUp"]],
                    virtualKeys: "#control-up",
                },
                down: {
                    physicalKeys: [["ArrowDown"]],
                    virtualKeys: "#control-down",
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
    
    readonly rotationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, 4))
    readonly translationDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.TranslationDragging.dragger(() => this.projectionViewMatrix, 4))
    readonly scaleDragging = gear.loops.draggingTarget(gear.property(this.view, "modelMatrix"), dragging.ScaleDragging.dragger(4))
    readonly zoomDragging = gear.loops.draggingTarget(gear.property(this, "projectionAndViewMatrices"), dragging.ZoomDragging.dragger(2))
    readonly colorDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "color"), positionToColor), dragging.positionDragging)
    readonly lightPositionDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightPosition"), toLightPosition), dragging.positionDragging)
    readonly shininessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly fogginessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "fogginess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly twistDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "twist"), ([_, y]) => y), dragging.positionDragging)
    readonly angleDragging = gear.loops.draggingTarget(mapped(gear.property(this, "angle"), ([x, _]) => x * Math.PI), dragging.positionDragging)

    readonly matricesGenerator = new MatricesGenerator();
    readonly depthElement = gear.required(document.getElementById("depth-watch")) 

    private constructor(private view: View) {
        this.view.color = positionToColor([0, 0])
        this.view.lightPosition = toLightPosition([-0.5, 0.5])
        this.depth = this.matricesGenerator.depth;

    }

    static async loop(): Promise<gear.loops.Loop> {
        const v = await view("canvas")
        return gear.loops.newLoop(new TreeToy(v), TreeToy.descriptor)
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
                fogginess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.fogginessDragging }, 
                twist: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.twistDragging }, 
                angle: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.angleDragging },
                up: { onPressed: () => this.depth += 1 },
                down: { onPressed: () => this.depth -= 1 }, 
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

    get depth(): number {
        return this.matricesGenerator.depth;
    }

    set depth(value: number) {
        const v = Math.max(0, Math.min(8, value));
        this.view.matrices = this.matricesGenerator.generateMatrices(v, null);
        this.depthElement.textContent = v.toString();
    }

    get angle(): number {
        return this.matricesGenerator.angle;
    }

    set angle(value: number) {
        this.view.matrices = this.matricesGenerator.generateMatrices(null, value);
    }

}

function mapped<A>(property: gear.Property<A>, mapper: gear.Mapper<gear.loops.PointerPosition, A>): gear.Property<gear.loops.PointerPosition> {
    const pos: [gear.loops.PointerPosition] = [[0, 0]]
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

function positionToColor(vec: gear.loops.PointerPosition): aether.Vec3 {
    const red = Math.min(2, 1 + aether.vec2.dot(vec, redVec)) / 2;
    const green = Math.min(2, 1 + aether.vec2.dot(vec, greenVec)) / 2;
    const blue = Math.min(2, 1 + aether.vec2.dot(vec, blueVec)) / 2;
    return [red, green, blue];
}

function toLightPosition(pos: gear.loops.PointerPosition) {
    const clampedP = aether.vec2.length(pos) > 1 ? aether.vec2.unit(pos) : pos
    const [x, y] = aether.vec2.of(clampedP[0] * Math.PI / 2, clampedP[1] * Math.PI / 2)
    const p = aether.vec3.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y));
    return p;
}

