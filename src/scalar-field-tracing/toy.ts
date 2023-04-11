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

    private speeds = [[0, 0], [0, 0], [0, 0]]

    constructor(private canvas: gpu.Canvas, private fieldRenderer: FieldRenderer) {
    }

    static async create(): Promise<Toy> {
        const device = await gpuDevice()
        const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element)
        const sampler = await FieldSampler.create(device);
        const renderer = await FieldRenderer.create(sampler.sample(), canvas);
        return new Toy(canvas, renderer)
    }

    inputWiring(inputs: gearx.LoopInputs<ToyDescriptor>): gearx.LoopInputWiring<ToyDescriptor> {
        const v = 0.01
        return {
            keys: {
                contour: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.contourTarget },
                rotation: { onPressed: () => inputs.pointers.primary.draggingTarget =  this.rotationDragging },
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
