import { aether, gear } from "/gen/libs.js"
import { gltf } from "../djee/index.js"
import * as gearx from "../utils/gear.js"
import * as v from "./view.js"
import * as dragging from "../utils/dragging.js"
import { LoopLogic } from "../utils/gear.js"

export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const toy = await Toy.create()
    const loop = gearx.newLoop(toy, Toy.descriptor)
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        input: {
            pointers: {
                canvas: {
                    element: "canvas",
                }
            },
            keys: {
                contour: {
                    alternatives: [["KeyC"]],
                    virtualKey: "#control-c",
                }, 
                rotation: {
                    alternatives: [["KeyR"]],
                    virtualKey: "#control-r",
                }, 
                zoom: {
                    alternatives: [["KeyZ"]],
                    virtualKey: "#control-z",
                }, 
                shininess: {
                    alternatives: [["KeyH"]],
                    virtualKey: "#control-h",
                }, 
                fogginess: {
                    alternatives: [["KeyF"]],
                    virtualKey: "#control-f",
                }, 
                lightDirection: {
                    alternatives: [["KeyD"]],
                    virtualKey: "#control-d",
                }, 
                lightRadius: {
                    alternatives: [["KeyL"]],
                    virtualKey: "#control-l",
                }, 
                export: {
                    alternatives: [["KeyX"]],
                    virtualKey: "#control-x",
                }, 
                incLOD: {
                    alternatives: [["ArrowUp"]],
                    virtualKey: "#control-up",
                }, 
                decLOD: {
                    alternatives: [["ArrowDown"]],
                    virtualKey: "#control-down",
                },
                prevField: {
                    alternatives: [["ArrowLeft"]],
                    virtualKey: "#control-left",
                }, 
                nextField: {
                    alternatives: [["ArrowRight"]],
                    virtualKey: "#control-right",
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
    } satisfies gearx.LoopDescriptor

    readonly contourTarget = gearx.draggingTarget(mapped(gearx.property(this, "contourValue"), ([_, y]) => y), dragging.positionDragging)
    readonly rotationDragging = gearx.draggingTarget(gearx.property(this, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, 4))
    readonly focalLengthDragging = gearx.draggingTarget(gearx.property(this.view, "focalLength"), dragging.RatioDragging.dragger())
    readonly lightPositionDragging = gearx.draggingTarget(mapped(gearx.property(this.view, "lightPosition"), this.toLightPosition.bind(this)), dragging.positionDragging)
    readonly lightRadiusDragging = gearx.draggingTarget(mapped(gearx.property(this.view, "lightRadius"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly shininessDragging = gearx.draggingTarget(mapped(gearx.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly fogginessDragging = gearx.draggingTarget(mapped(gearx.property(this.view, "fogginess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)

    private lodElement = gearx.required(document.getElementById("lod")) 
    private meshComputer: gear.DeferredComputation<void> = new gear.DeferredComputation(() => this.view.setMesh(WebGL2RenderingContext.TRIANGLES, this.scalarFieldInstance.vertices))

    private _field = 0

    constructor(private view: v.View, private scalarFieldInstance: aether.ScalarFieldInstance) {
        view.matView = aether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0])
        view.focalLength = Math.pow(2, 1.5)
        this.modelMatrix = aether.mat4.identity()
        this.contourValue = 0.01
        this.resolution = 64
        this.field = 0
    }

    static async create() {
        const scalarFieldModule = await aether.loadScalarFieldModule()
        const scalarFieldInstance = scalarFieldModule.newInstance()
        const view = await v.newView(Toy.descriptor.output.canvases.scene.element)
        return new Toy(view, scalarFieldInstance)
    }

    inputWiring(inputs: gearx.LoopInputs<ToyDescriptor>): gearx.LoopInputWiring<ToyDescriptor> {
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
        }
    }

    outputWiring(): gearx.LoopOutputWiring<ToyDescriptor> {
        return {
            onRender: () => this.view.render(),
            canvases: {
                scene: {
                    onResize: () => this.view.resize()
                }
            }
        }
    }

    animate(): void {
    }

    get projectionViewMatrix() {
        return aether.mat4.mul(this.view.matProjection, this.view.matView)
    }

    get modelMatrix() {
        return this.view.matPositions
    }

    set modelMatrix(m: aether.Mat4) {
        this.view.setMatModel(m, m)
    }

    get contourValue() {
        return this.scalarFieldInstance.contourValue
    }

    set contourValue(v: number) {
        this.scalarFieldInstance.contourValue = v
        this.view.color = this.fieldColor(v)
        this.meshComputer.perform()
    }

    get resolution() {
        return this.scalarFieldInstance.resolution
    }

    set resolution(r: number) {
        if (r > 96 || r < 32) {
            return
        }
        this.scalarFieldInstance.resolution = r
        this.lodElement.innerText = r.toString()
        this.meshComputer.perform()
    }

    get field() {
        return this._field
    }

    set field(f: number) {
        if (f < 0 || f >= fields.length) {
            return
        }
        this._field = f
        this.scalarFieldInstance.sampler = fields[f]
        this.meshComputer.perform()
    }

    fieldColor(contourValue: number = this.scalarFieldInstance.contourValue): aether.Vec<4> {
        return contourValue > 0 ?
            [1, 0, (1 - contourValue) / (1 + contourValue), 1] : 
            [1 - (1 + contourValue) / (1 - contourValue), 1, 0, 1] 
    }

    saveModel() {
        const model = gltf.createModel("ScalarField", this.scalarFieldInstance.vertices)
        const canvas = document.getElementById("canvas-gl") as HTMLCanvasElement

        gearx.save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', 'ScalarField.gltf')
        gearx.save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', 'ScalarField.bin')
        gearx.save(canvas.toDataURL("image/png"), 'image/png', 'ScalarField.png')
    }

    toLightPosition(pos: gear.PointerPosition): aether.Vec4 {
        const unclampedP = aether.vec2.mul(pos, [this.view.canvas.width / this.view.canvas.height, 1])
        const clampedP = aether.vec2.length(unclampedP) > 1 ? aether.vec2.unit(unclampedP) : unclampedP
        const [x, y] = aether.vec2.scale(clampedP, Math.PI / 2)
        const p = aether.vec3.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y));
        return [...p, 1];
    }

}

const twoPi = 2 * Math.PI

const fields = [xyz, envelopedCosine]

function xyz(x: number, y: number, z: number): aether.Vec<4> {
    return [
        y * z,
        z * x,
        x * y,
        x * y * z
    ]
}

function envelopedCosine(x: number, y: number, z: number): aether.Vec<4> {
    const x2 = x * x
    const y2 = y * y
    const z2 = z * z
    if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
        const piX2 = Math.PI * x2
        const piY2 = Math.PI * y2
        const piZ2 = Math.PI * z2
        const envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8

        const piX = Math.PI * x
        const piY = Math.PI * y
        const piZ = Math.PI * z
        const value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ)

        const dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4 
        const dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4 
        const dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4 

        const dValueDX = -twoPi * Math.sin(2 * piX)
        const dValueDY = -twoPi * Math.sin(2 * piY)
        const dValueDZ = -twoPi * Math.sin(2 * piZ)

        return [
            dEnvelopeDX * value + envelope * dValueDX,
            dEnvelopeDY * value + envelope * dValueDY,
            dEnvelopeDZ * value + envelope * dValueDZ,
            envelope * value / 3
        ]
    } else {
        return [0, 0, 0, 0]
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
