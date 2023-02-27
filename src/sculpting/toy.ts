import { aether, gear } from "/gen/libs.js"
import { gltf } from "../djee/index.js"
import { Carving } from "./carving.js"
import * as v from "../scalar-field/view.js"
import * as dragging from "../utils/dragging.js"
import * as gearx from "../utils/gear.js"

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
    const loop = gearx.newLoop(toy, Toy.descriptor)
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements gearx.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        fps: {
            element: "fps-watch"
        },
        styling: {
            pressedButton: "pressed"
        },
        input: {
            pointers: {
                canvas: {
                    element: "canvas",
                }
            },
            keys: {
                carving: {
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
                lightDirection: {
                    alternatives: [["KeyD"]],
                    virtualKey: "#control-d",
                }, 
                lightRadius: {
                    alternatives: [["KeyL"]],
                    virtualKey: "#control-l",
                }, 
                undo: {
                    alternatives: [["KeyU"]],
                    virtualKey: "#control-u",
                }, 
                export: {
                    alternatives: [["KeyX"]],
                    virtualKey: "#control-x",
                }, 
                save: {
                    alternatives: [["KeyS"]],
                    virtualKey: "#control-s",
                }, 
                incLOD: {
                    alternatives: [["ArrowUp"]],
                    virtualKey: "#control-up",
                }, 
                decLOD: {
                    alternatives: [["ArrowDown"]],
                    virtualKey: "#control-down",
                },
            }
        }
    } satisfies gearx.LoopDescriptor

    readonly carvingTarget: gearx.DraggingTarget
    readonly rotationDragging = gearx.draggingTarget(gearx.property(this, "modelMatrix"), dragging.RotationDragging.dragger(() => this.projectionViewMatrix, 4))
    readonly focalLengthDragging = gearx.draggingTarget(gearx.property(this, "focalLength"), dragging.RatioDragging.dragger())
    readonly lightPositionDragging = gearx.draggingTarget(mapped(gearx.property(this.view, "lightPosition"), this.toLightPosition.bind(this)), dragging.positionDragging)
    readonly lightRadiusDragging = gearx.draggingTarget(mapped(gearx.property(this.view, "lightRadius"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)
    readonly shininessDragging = gearx.draggingTarget(mapped(gearx.property(this.view, "shininess"), ([_, y]) => (y + 1) / 2), dragging.positionDragging)

    readonly carving: Carving

    private lodElement = gearx.required(document.getElementById("lod")) 

    private lazyVertices = new gear.DeferredComputation(() => this.currentStone.vertices)

    constructor(private stone: aether.ScalarFieldInstance, private scalarFieldModule: aether.ScalarFieldModule, private view: v.View, picker: v.Picker) {
        const sizeManager = new gearx.CanvasSizeManager(true)
        sizeManager.observe(view.canvas, () => {
            view.resize()
            picker.resize()
        })

        this.carving = new Carving(
            this.stone,
            () => modelViewProjectionMatrixOf(view),
            picker,
            scalarFieldModule, 
            brush
        )
        this.carvingTarget = gearx.draggingTarget(gearx.property(this, "currentStone"), this.carving)

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

    wiring(loop: gearx.Loop<ToyDescriptor>): gearx.LoopWiring<ToyDescriptor> {
        return {
            pointers: {
                canvas: { defaultDraggingTarget: this.rotationDragging },
            },
            keys: {
                carving: { onPressed: () => loop.pointers.canvas.draggingTarget = this.carvingTarget }, 
                rotation: { onPressed: () => loop.pointers.canvas.draggingTarget = this.rotationDragging }, 
                zoom: { onPressed: () => loop.pointers.canvas.draggingTarget = this.focalLengthDragging }, 
                shininess: { onPressed: () => loop.pointers.canvas.draggingTarget = this.shininessDragging }, 
                lightDirection: { onPressed: () => loop.pointers.canvas.draggingTarget = this.lightPositionDragging }, 
                lightRadius: { onPressed: () => loop.pointers.canvas.draggingTarget = this.lightRadiusDragging }, 
                undo: { onPressed: () => this.currentStone = this.carving.undo(this.currentStone) }, 
                export: { onPressed: () => this.exportModel() }, 
                save: { onPressed: () => this.saveModel() }, 
                incLOD: { onPressed: () => this.addToLOD(8) }, 
                decLOD: { onPressed: () => this.addToLOD(-8) },
            }
        }
    }

    animate(): void {
    }
    
    render(): void {
        this.view.render()
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

        gearx.save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', `Model.gltf`)
        gearx.save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', `Model.bin`)
    }

    saveModel() {
        const buffer = this.serializeStone()
        gearx.save(URL.createObjectURL(new Blob([buffer])), 'application/binary', `Model.ssf`)
    }

    toLightPosition(pos: gear.PointerPosition): aether.Vec4 {
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
            gearx.required(item.getAsFile()).arrayBuffer() :
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

function clamp(n: number, min: number, max: number) {
    return n < min ? min : (n > max ? max : n)
}

