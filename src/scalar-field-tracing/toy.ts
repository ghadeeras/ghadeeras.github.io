import { gpu } from "lumen"
import * as dragging from "../utils/dragging.js"
import { FieldRenderer } from "./renderer.js";
import { FieldSampler } from "./sampler.js";
import * as aether from "aether"
import * as gear from "gear"

export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const toy = await Toy.create()
    const loop = gear.loops.newLoop(toy, Toy.descriptor)
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements gear.loops.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
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
    } satisfies gear.loops.LoopDescriptor

    readonly contourTarget = gear.loops.draggingTarget(mapped(gear.property(this.fieldRenderer, "contourValue"), ([_, y]) => y), dragging.positionDragging)
    readonly rotationDragging = gear.loops.draggingTarget(gear.property(this.fieldRenderer, "modelMatrix"), dragging.RotationDragging.dragger(() => this.fieldRenderer.projectionViewMatrix, 4))
    readonly matrixDragging = gear.loops.draggingTarget(gear.property(this, "matrix"), dragging.RotationDragging.dragger(() => aether.mat4.identity()))
    readonly scaleDragging = gear.loops.draggingTarget(gear.property(this, "scale"), dragging.RatioDragging.dragger(Math.SQRT1_2, Math.SQRT2, 0.5))

    private speeds = [[0, 0], [0, 0], [0, 0]]

    private resampling = new gear.DeferredComputation(() => this.fieldSampler.sample())
    private lodElement = gear.required(document.getElementById("lod"))

    constructor(private canvas: gpu.Canvas, private fieldRenderer: FieldRenderer, private fieldSampler: FieldSampler) {
        this.changeDepth(0)
    }

    static async create(): Promise<Toy> {
        const device = await gpuDevice()
        const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element)
        const sampler = await FieldSampler.create(device);
        const renderer = await FieldRenderer.create(sampler.fieldTexture, canvas);
        return new Toy(canvas, renderer, sampler)
    }

    get scale() {
        return this.fieldSampler.scale
    }

    set scale(v: number) {
        this.fieldSampler.scale = v
        this.resampling.perform()
    }

    get matrix() {
        return aether.mat4.cast(this.fieldSampler.matrix)
    }

    set matrix(m: aether.Mat4) {
        this.fieldSampler.matrix = [
            aether.vec3.from(m[0]),
            aether.vec3.from(m[1]),
            aether.vec3.from(m[2]),
        ];
        this.resampling.perform()
    }

    changeDepth(delta: number) {
        this.fieldSampler.depth += delta
        this.fieldRenderer.step = Math.pow(0.5, this.fieldSampler.depth / 3.0 + 3.0);
        this.resampling.perform()
        this.lodElement.innerText = this.fieldSampler.depth.toFixed(0)
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>, outputs: gear.loops.LoopOutputs<ToyDescriptor>): gear.loops.LoopInputWiring<ToyDescriptor> {
        const v = 0.01
        return {
            keys: {
                contour: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.contourTarget },
                rotation: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.rotationDragging },
                matrix: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.matrixDragging },
                scale: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.scaleDragging },
                incDepth: { onPressed: () => this.changeDepth(+1) },
                decDepth: { onPressed: () => this.changeDepth(-1) },
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() },
            },
            pointers: {
                primary: {
                    defaultDraggingTarget: this.rotationDragging
                }
            }
        }
    }

    outputWiring(): gear.loops.LoopOutputWiring<ToyDescriptor> {
        return {
            canvases: {
                scene: {
                    onResize: () => this.canvas.resize()
                }
            },
            onRender: () => this.render()
        }
    }
    
    animate(): void {
        let v: aether.Vec3 = [
            this.speeds[0][0] - this.speeds[0][1],
            this.speeds[1][0] - this.speeds[1][1],
            this.speeds[2][1] - this.speeds[2][0],
        ];
        const velocity = aether.vec3.from(aether.vec4.prod([...v, 0], this.fieldRenderer.orientation))
        this.fieldRenderer.position = aether.vec3.add(this.fieldRenderer.position, velocity)
    }

    render() {
        this.fieldRenderer.render(this.canvas.attachment({r: 0, g: 0, b: 0, a: 0}))
    }

}

async function gpuDevice() {
    const gpuStatus = gear.required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
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
