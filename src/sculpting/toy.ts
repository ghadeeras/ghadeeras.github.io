import * as aether from "aether"
import * as gear from "gear"
import { gltf } from "../djee/index.js"
import { Carving } from "./carving.js"
import * as v from "../scalar-field/view.js"
import * as dragging from "../utils/dragging.js"

const viewMatrix = aether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0])

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/sculpting"
export const video = "https://youtu.be/eeZ6qSAXo2o"
export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const view = await v.newView(Toy.descriptor.input.pointers.canvas.element)
    const picker = await view.picker()

    const scalarFieldModule = await aether.loadScalarFieldModule()
    const stone = scalarFieldModule.newInstance()
    stone.resolution = 64
    stone.sampler = field
    stone.contourValue = 0.5

    const toy = new Toy(stone, scalarFieldModule, view, picker)
    const loop = gear.loops.newLoop(toy, Toy.descriptor)
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements gear.loops.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        input: {
            pointers: {
                canvas: {
                    element: "canvas",
                }
            },
            keys: {
                carving: {
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
                lightDirection: {
                    physicalKeys: [["KeyD"]],
                    virtualKeys: "#control-d",
                }, 
                lightRadius: {
                    physicalKeys: [["KeyL"]],
                    virtualKeys: "#control-l",
                }, 
                undo: {
                    physicalKeys: [["KeyU"]],
                    virtualKeys: "#control-u",
                }, 
                export: {
                    physicalKeys: [["KeyX"]],
                    virtualKeys: "#control-x",
                }, 
                save: {
                    physicalKeys: [["KeyS"]],
                    virtualKeys: "#control-s",
                }, 
                record: {
                    physicalKeys: [["KeyV"]],
                    virtualKeys: "#control-v",
                },
                incLOD: {
                    physicalKeys: [["ArrowUp"]],
                    virtualKeys: "#control-up",
                }, 
                decLOD: {
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

    readonly carvingTarget: gear.loops.DraggingTarget
    readonly rotationDragging = gear.loops.draggingTarget(gear.property(this, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, 4))
    readonly focalLengthDragging = gear.loops.draggingTarget(gear.property(this, "focalLength"), dragging.RatioDragging.dragger())
    readonly lightPositionDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightPosition"), this.toLightPosition.bind(this)), dragging.positionDragging)
    readonly lightRadiusDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "lightRadius"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly shininessDragging = gear.loops.draggingTarget(mapped(gear.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)

    readonly carving: Carving

    private lodElement = gear.required(document.getElementById("lod")) 

    private lazyVertices = new gear.DeferredComputation(() => this.currentStone.vertices)

    constructor(private stone: aether.ScalarFieldInstance, private scalarFieldModule: aether.ScalarFieldModule, private view: v.View, private picker: v.Picker) {
        this.carving = new Carving(
            this.stone,
            () => modelViewProjectionMatrixOf(view),
            picker,
            scalarFieldModule, 
            brush
        )
        this.carvingTarget = gear.loops.draggingTarget(gear.property(this, "currentStone"), this.carving)

        this.dropOn(view.canvas)

        view.matView = viewMatrix
        view.focalLength = 4
        view.color = [0.5, 0.5, 0.5, 1.0]
        view.shininess = 1
        view.fogginess = 0.0
        view.lightPosition = this.toLightPosition([0.0, 0.0])
        view.lightRadius = 0.005

        this.modelMatrix = aether.mat4.identity()
        this.currentStone = stone
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>, outputs: gear.loops.LoopOutputs<ToyDescriptor>): gear.loops.LoopInputWiring<ToyDescriptor> {
        return {
            pointers: {
                canvas: { defaultDraggingTarget: this.rotationDragging },
            },
            keys: {
                carving: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.carvingTarget }, 
                rotation: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.rotationDragging }, 
                zoom: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.focalLengthDragging }, 
                shininess: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.shininessDragging }, 
                lightDirection: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightPositionDragging }, 
                lightRadius: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.lightRadiusDragging }, 
                undo: { onPressed: () => this.currentStone = this.carving.undo(this.currentStone) }, 
                export: { onPressed: () => this.exportModel() }, 
                save: { onPressed: () => this.saveModel() }, 
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() }, 
                incLOD: { onPressed: () => this.addToLOD(8) }, 
                decLOD: { onPressed: () => this.addToLOD(-8) },
            }
        }
    }

    outputWiring(): gear.loops.LoopOutputWiring<ToyDescriptor> {
        return {
            onRender: () => this.view.render(),
            canvases: {
                scene: { onResize: () => this.resize() }
            },
        }
    }

    private resize() {
        this.view.resize()
        this.picker.resize()
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

    get focalLength() {
        return this.view.focalLength
    }

    set focalLength(l: number) {
        this.view.focalLength = l
    }

    get currentStone() {
        return this.stone
    }

    set currentStone(s: aether.ScalarFieldInstance) {
        this.stone = s
        this.lodElement.innerText = s.resolution.toFixed(0)
        this.lazyVertices.perform().then(vertices => this.view.setMesh(WebGL2RenderingContext.TRIANGLES, vertices))
    }

    addToLOD(delta: number) {
        this.stone.resolution = clamp(this.stone.resolution + delta, 32, 96)
        this.currentStone = this.stone
    }

    exportModel() {
        const model = gltf.createModel("Model", this.stone.vertices)

        gear.save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', `Model.gltf`)
        gear.save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', `Model.bin`)
    }

    saveModel() {
        const buffer = this.serializeStone()
        gear.save(URL.createObjectURL(new Blob([buffer])), 'application/binary', `Model.ssf`)
    }

    toLightPosition(pos: gear.loops.PointerPosition): aether.Vec4 {
        const unclampedP = aether.vec2.mul(pos, [this.view.canvas.width / this.view.canvas.height, 1])
        const clampedP = aether.vec2.length(unclampedP) > 1 ? aether.vec2.unit(unclampedP) : unclampedP
        const [x, y] = aether.vec2.scale(clampedP, Math.PI / 2)
        const p = aether.vec3.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y));
        return [...p, 1];
    }

    private serializeStone() {
        const samplesCount = (this.stone.resolution + 1) ** 3
        const vectorSize = 4
        const headerSize = 4
        const buffer = new ArrayBuffer(
            headerSize * Uint16Array.BYTES_PER_ELEMENT +
            samplesCount * vectorSize * Float64Array.BYTES_PER_ELEMENT
        )
        const header = new Uint16Array(buffer, 0, headerSize)
        const samples = new Float64Array(buffer, header.byteLength)
        header[0] = "SF".charCodeAt(0) + ("SF".charCodeAt(1) << 8)
        header[1] = this.stone.resolution
        header[2] = this.stone.resolution
        header[3] = this.stone.resolution
        for (let k = 0; k <= this.stone.resolution; k++) {
            const z = 2 * k /  this.stone.resolution - 1
            const jOffset = k * this.stone.resolution
            for (let j = 0; j <= this.stone.resolution; j++) {
                const y = 2 * j /  this.stone.resolution - 1
                const iOffset = (jOffset + j) * this.stone.resolution
                for (let i = 0; i <= this.stone.resolution; i ++) {
                    const x = 2 * i /  this.stone.resolution - 1
                    const offset = (iOffset + i) * vectorSize
                    samples.set(this.stone.getNearest(x, y, z), offset)
                }
            }
        }
        return buffer
    }

    private deserializeStone(buffer: ArrayBuffer): aether.ScalarFieldInstance {
        const vectorSize = 4
        const headerSize = 4
        const header = new Uint16Array(buffer, 0, headerSize)
        const samples = new Float64Array(buffer, header.byteLength)
        const s = String.fromCharCode(header[0] & 0xFF) + String.fromCharCode(header[0] >>> 8)
        if (s !== "SF") {
            alert("Invalid file format!")
            return this.stone
        }
        const xRes = header[1]
        const yRes = header[2]
        const zRes = header[3]
        const samplesCount = (xRes + 1) * (yRes + 1) * (zRes + 1)
        if (samplesCount * vectorSize !== samples.length) {
            alert("Invalid file format!")
            return this.stone
        }
        const stone = this.scalarFieldModule.newInstance()
        stone.resolution = Math.round((xRes * yRes * zRes) ** (1 / 3))
        stone.sampler = (x, y, z) => {
            const i = Math.round((x + 1) * xRes / 2)
            const j = Math.round((y + 1) * yRes / 2)
            const k = Math.round((z + 1) * zRes / 2)
            const offset = ((k * yRes + j) * xRes + i) * vectorSize
            return offset < samples.length ? 
                aether.vec4.from(samples, offset) : 
                aether.vec4.of(0, 0, 0, 0)
        }
        const newStone = this.carving.undo(this.currentStone)
        newStone.resolution = stone.resolution
        newStone.sampler = (x, y, z) => stone.get(x, y, z)
        return newStone
    }

    dropOn(element: HTMLElement) {
        element.ondragover = e => {
            e.preventDefault()
        }
        element.ondrop = async e => {
            this.currentStone = this.deserializeStone(await data(e))
        }
    }
    
}

async function data(e: DragEvent): Promise<ArrayBuffer> {
    e.preventDefault()
    if (e.dataTransfer) {
        const item = e.dataTransfer.items[0]
        return item.kind == 'file' ?
            gear.required(item.getAsFile()).arrayBuffer() :
            asURL(item).then(fetch).then(response => response.arrayBuffer())
    } else {
        return Promise.reject("Not a data transfer!")
    }
}

async function asURL(transferItem: DataTransferItem): Promise<string> {
    return await new Promise((resolve, reject) => {
        try {
            transferItem.getAsString(resolve)
        } catch (e) {
            reject(e)
        }
    })
}

const twoPi = 2 * Math.PI

function modelViewProjectionMatrixOf(view: v.View): aether.Mat4 {
    return aether.mat4.mul(
        view.matProjection,
        aether.mat4.mul(
            view.matView,
            view.matPositions
        )
    )
}

function field(x: number, y: number, z: number): aether.Vec<4> {
    const l = aether.vec3.length([x, y, z])
    const f = l <= 1 ? 
        l >= 0.5 ? (1 - Math.cos(twoPi * l)) / 2 : 1 : 
        0
    const g = l <= 1 ? 
        l >= 0.5 ? Math.PI * Math.sin(twoPi * l) / l : 0 : 
        0
    return [
        x * g,
        y * g,
        z * g,
        f
    ]
}

function brush(x: number, y: number, z: number): aether.Vec<4> {
    const l = aether.vec3.length([x, y, z])
    const f = l <= 1 ? (1 + Math.cos(Math.PI * l)) / 2 : 0
    const g = l <= 1 ? 
        l > Math.sqrt(Number.EPSILON) ? 
            (-Math.PI / 2) * Math.sin(Math.PI * l) / l : 
            -Math.PI * Math.PI / 2 : 
        0
    return [
        x * g,
        y * g,
        z * g,
        f
    ]
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

function clamp(n: number, min: number, max: number) {
    return n < min ? min : (n > max ? max : n)
}

