import * as gpu from "../djee/gpu/index.js"
import * as gear from "/gear/latest/index.js";
import * as gearx from "../utils/gear.js";
import * as dragging from "../utils/dragging.js"
import { FieldRenderer } from "./renderer.js";
import { FieldSampler } from "./sampler.js";
import { aether } from "../libs.js";

export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    console.log("Initializing")
    const toy = await Toy.create()
    const loop = gearx.newLoop(toy, Toy.descriptor)
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements gearx.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        input: {
            keys: {
                contour: {
                    alternatives: [["KeyC"]],
                    virtualKey: "#control-c"
                },
                rotation: {
                    alternatives: [["KeyR"]],
                    virtualKey: "#control-r"
                },
                scale: {
                    alternatives: [["KeyS"]],
                    virtualKey: "#control-s"
                },
                matrix: {
                    alternatives: [["KeyM"]],
                    virtualKey: "#control-m"
                },
                incDepth: {
                    alternatives: [["ArrowUp"]],
                    virtualKey: "#control-up"
                },
                decDepth: {
                    alternatives: [["ArrowDown"]],
                    virtualKey: "#control-down"
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
    } satisfies gearx.LoopDescriptor

    readonly contourTarget = gearx.draggingTarget(mapped(gearx.property(this.fieldRenderer, "contourValue"), ([_, y]) => y), dragging.positionDragging)
    readonly rotationDragging = gearx.draggingTarget(gearx.property(this.fieldRenderer, "modelMatrix"), dragging.RotationDragging.dragger(() => this.fieldRenderer.projectionViewMatrix, 4))
    readonly matrixDragging = gearx.draggingTarget(gearx.property(this, "matrix"), dragging.RotationDragging.dragger(() => aether.mat4.identity()))
    readonly scaleDragging = gearx.draggingTarget(gearx.property(this, "scale"), dragging.RatioDragging.dragger(Math.SQRT1_2, Math.SQRT2, 0.5))

    private speeds = [[0, 0], [0, 0], [0, 0]]

    private resampling = new gear.DeferredComputation(() => this.fieldRenderer.scalarField = this.fieldSampler.sample())
    private lodElement = gearx.required(document.getElementById("lod"))

    constructor(private canvas: gpu.Canvas, private fieldRenderer: FieldRenderer, private fieldSampler: FieldSampler) {
        this.changeDepth(0)
    }

    static async create(): Promise<Toy> {
        const device = await gpuDevice()
        const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element)
        const sampler = await FieldSampler.create(device);
        const renderer = await FieldRenderer.create(sampler.sample(), canvas);
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
        this.fieldRenderer.step = Math.pow(0.5, 0.25 * this.fieldSampler.depth + 3.5);
        this.resampling.perform()
        this.lodElement.innerText = this.fieldSampler.depth.toFixed(0)
    }

    inputWiring(inputs: gearx.LoopInputs<ToyDescriptor>): gearx.LoopInputWiring<ToyDescriptor> {
        const v = 0.01
        return {
            keys: {
                contour: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.contourTarget },
                rotation: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.rotationDragging },
                matrix: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.matrixDragging },
                scale: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.scaleDragging },
                incDepth: { onPressed: () => this.changeDepth(+1) },
                decDepth: { onPressed: () => this.changeDepth(-1) },
            },
            pointers: {
                primary: {
                    defaultDraggingTarget: this.rotationDragging
                }
            }
        }
    }

    outputWiring(): gearx.LoopOutputWiring<ToyDescriptor> {
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
    const gpuStatus = gearx.required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}

function mapped<A>(property: gearx.Property<A>, mapper: gear.Mapper<gear.PointerPosition, A>): gearx.Property<gear.PointerPosition> {
    const pos: [gear.PointerPosition] = [[0, 0]]
    return {
        getter: () => pos[0],
        setter: b => {
            pos[0] = b
            property.setter(mapper(b))
        }
    }
}
