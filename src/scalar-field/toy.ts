import * as ether from "../../ether/latest/index.js"
import * as gear from "../gear/all.js"
import * as gltf from "../djee/gltf.js"
import * as v from "./view.js"
import { ScalarFieldExports } from "../../ether/latest/index.js"
import { MemExports, SpaceExports } from "../../vibrato.js/latest/js/rt.js"

type FieldSampler = (x: number, y: number, z: number) => ether.Vec<4>

let resolution = 64
let fieldSampler: FieldSampler = envelopedCosine

let contourValue: number = 0
let fieldRef: number = 0

type Modules = {
    mem: MemExports
    space: SpaceExports
    scalarField: ScalarFieldExports
}

export function init() {
    window.onload = () => doInit()
}

const viewMatrix = ether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0])
const projectionMatrix = ether.mat4.projection(2)

async function doInit() {
    const wa = await ether.initWaModules()
    const modules: Modules = {
        mem: v.required(wa.mem.exports),
        space: v.required(wa.space.exports),
        scalarField: v.required(wa.scalarField.exports)
    }

    const view = await v.newView("canvas-gl")
    view.matView = viewMatrix
    view.matProjection = projectionMatrix

    fieldRef = sampleField(modules)

    const canvas = gear.elementEvents("canvas-gl")
    const transformer = new gear.Transformer(canvas.element, ether.mat4.mul(projectionMatrix, viewMatrix))
    canvas.dragging.branch(
        flow => flow.map(d => d.pos).map(([x, y]) => gear.pos(
            2 * (x - canvas.element.clientWidth / 2 ) / canvas.element.clientWidth, 
            2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
        )).branch(
            flow => flow.filter(selected("focalRatio")).map(([x, y]) => y).to(focalRatioSink(view)),
            flow => flow.filter(selected("contourValue")).map(([x, y]) => y).defaultsTo(0.01).to(contourValueSink(modules, view)),
            flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(shininessSink(view)),
            flow => flow.filter(selected("outlineSharpness")).map(([x, y]) => y).to(outlineSharpnessSink(view)),
            flow => flow.filter(selected("lightPosition")).to(lightPositionSink(view)),
            flow => flow.filter(selected("lightRadius")).map(([x, y]) => y).to(lightRadiusSink(view)),
            flow => flow.filter(selected("fogginess")).map(([x, y]) => y).to(fogginessSink(view)),
        ),
        flow => flow
            .filter(selected("rotation"))
            .map(transformer.rotation)
            .to(rotationSink(view))
    )
    levelOfDetailsFlow().to(levelOfDetailsSink(modules, view))
    gear.readableValue("function").to(functionSink(modules, view))

    gear.elementEvents("save").click.producer(() => saveModel(modules))
}

function selected<T>(value: string): gear.Predicate<T> {
    const mouseBinding = document.getElementById("mouse-binding") as HTMLInputElement
    return () => mouseBinding.value == value
}

function levelOfDetailsFlow() {
    const inc = gear.elementEvents("lod-inc").mouseButtons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? +8 : 0)
    const dec = gear.elementEvents("lod-dec").mouseButtons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? -8 : 0)
    const flow = gear.Flow.from(inc, dec)
        .defaultsTo(0)
        .then(gear.repeater(128, 0))
        .reduce((i, lod) => clamp(lod + i, 32, 96), 64)
    flow.map(lod => lod.toString()).to(gear.text("lod"))
    return flow
}

function clamp(n: number, min: number, max: number) {
    return n < min ? min : (n > max ? max : n)
}

function levelOfDetailsSink(modules: Modules, view: v.View): gear.Sink<number> {
    return gear.sinkFlow(flow => flow
        .defaultsTo(64)
        .producer(lod => {
            resolution = lod
            fieldRef = sampleField(modules)
            view.setMesh(WebGLRenderingContext.TRIANGLES, contourSurfaceData(modules, fieldRef, contourValue))
        })
    )
}

function contourValueSink(modules: Modules, view: v.View): gear.Sink<number> {
    return gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
            contourValue = newContourValue
            view.setMesh(WebGLRenderingContext.TRIANGLES, contourSurfaceData(modules, fieldRef, contourValue))
            view.color = fieldColor(contourValue, 1)
        })
    )
}

function fieldColor(fieldValue: number, alpha: number = 0.4): ether.Vec<4> {
    return fieldValue > 0 ?
        [1, 0, (1 - fieldValue) / (1 + fieldValue), alpha] : 
        [1 - (1 + fieldValue) / (1 - fieldValue), 1, 0, alpha] 
}

function rotationSink(view: v.View): gear.Sink<ether.Mat<4>> {
    return gear.sinkFlow(flow => flow.defaultsTo(ether.mat4.identity()).producer(matrix => {
        view.setMatModel(matrix, matrix)
    }))
}

function focalRatioSink(view: v.View): gear.Sink<number> {
    return gear.sinkFlow(flow => flow.defaultsTo(0).map(ratio => (ratio + 1.4) * 2).producer(ratio => {
        view.matProjection = ether.mat4.projection(ratio)
    }))
}

function lightPositionSink(view: v.View): gear.Sink<gear.PointerPosition> {
    return gear.sinkFlow(flow => flow
        .defaultsTo([0.5, 0.5])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
            view.lightPosition = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1]
        })
    )
}

function lightRadiusSink(view: v.View): gear.Sink<number> {
    return gear.sinkFlow(flow => flow
        .map(r => (r + 1) / 2)
        .defaultsTo(0.1)
        .producer(r => {
            view.lightRadius = r
        })
    )
}

function shininessSink(view: v.View): gear.Sink<number> {
    return gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            view.shininess = value
        })
    )
}

function outlineSharpnessSink(view: v.View): gear.Sink<number> {
    return gear.sinkFlow(flow => flow
        .defaultsTo(1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            view.outlineSharpness = value
        })
    )
}

function fogginessSink(view: v.View): gear.Sink<number> {
    return gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            view.fogginess = value
        })
    )
}

function functionSink(modules: Modules, view: v.View): gear.Sink<string> {
    return gear.sinkFlow(flow => flow
        .defaultsTo("xyz")
        .producer(functionName => {
            fieldSampler = getFieldFunction(functionName)
            fieldRef = sampleField(modules)
            view.setMesh(WebGLRenderingContext.TRIANGLES, contourSurfaceData(modules, fieldRef, contourValue))
        })
    )
}

function getFieldFunction(functionName: string) {
    switch (functionName) {
        case "xyz": return xyz
        case "envelopedCosine": return envelopedCosine
        default: return xyz
    }
}

function sampleField(modules: Modules): number {
    if (!modules.mem || !modules.space) {
        throw new Error("Failed to initialize Web Assembly Ether modules!")
    }
    modules.mem.leave()

    modules.mem.leave()
    modules.mem.enter()
    const length = 8 * (resolution + 1) ** 3 
    const ref = modules.mem.allocate64(length)
    const view = new Float64Array(modules.mem.stack.buffer, ref, length)
    let i = 0
    for (let z = 0; z <= resolution; z++) {
        for (let y = 0; y <= resolution; y++) {
            for (let x = 0; x <= resolution; x++) {
                const px = 2 * x / resolution - 1
                const py = 2 * y / resolution - 1
                const pz = 2 * z / resolution - 1
                const v = fieldSampler(px, py, pz)
                view[i++] = px
                view[i++] = py
                view[i++] = pz
                view[i++] = 1
                view[i++] = v[0]
                view[i++] = v[1]
                view[i++] = v[2]
                view[i++] = v[3]
            }
        }
    }
    modules.mem.enter()
    return ref
}

function contourSurfaceData(modules: Modules, fieldRef: number, contourValue: number): Float32Array {
    if (!modules.mem || !modules.scalarField) {
        throw new Error("Failed to initialize Web Assembly Ether modules!")
    }
    modules.mem.leave()
    modules.mem.enter()
    const begin = modules.scalarField.tesselateScalarField(fieldRef, resolution, contourValue)
    const end = modules.mem.allocate8(0)
    const result = new Float32Array(modules.mem.stack.buffer, begin, (end - begin) / 4)
    return result
}

const twoPi = 2 * Math.PI

function xyz(x: number, y: number, z: number): ether.Vec<4> {
    return [
        y * z,
        z * x,
        x * y,
        x * y * z
    ]
}

function envelopedCosine(x: number, y: number, z: number): ether.Vec<4> {
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

async function saveModel(modules: Modules) {
    const model = createModel(modules, "ScalarField")

    const anchor1 = document.createElement("a")
    anchor1.href = URL.createObjectURL(new Blob([JSON.stringify(model.model)]))
    anchor1.type = 'text/json'
    anchor1.target = '_blank'
    anchor1.download = 'ScalarField.gltf'
    anchor1.click()

    const anchor2 = document.createElement("a")
    anchor2.href = URL.createObjectURL(new Blob([model.binary]))
    anchor2.type = 'application/gltf-buffer'
    anchor2.target = '_blank'
    anchor2.download = 'ScalarField.bin'
    anchor2.click()

    const anchor3 = document.createElement("a")
    const canvas = document.getElementById("canvas-gl") as HTMLCanvasElement
    anchor3.href = canvas.toDataURL("image/png")
    anchor3.type = 'image/png'
    anchor3.target = '_blank'
    anchor3.download = 'ScalarField.png'
    anchor3.click()
}

type VerticesMap = {
    [component: number]: VerticesMap | undefined
    index?: number
}

type IndexedVertices = {
    indices: number[],
    vertices: number[],
    minPos: number[],
    maxPos: number[]
}

type ModelAndBinary = {
    model: gltf.Model,
    binary: ArrayBuffer
}

function createModel(modules: Modules, name: string): ModelAndBinary {
    const indexedVertices: IndexedVertices = indexVertices(contourSurfaceData(modules, fieldRef, contourValue))
    return {
        model: createModelJson(name, indexedVertices),
        binary: createBinaryBuffer(indexedVertices)
    }
}

function createModelJson(name: string, indexedVertices: IndexedVertices): gltf.Model {
    const verticesCount = indexedVertices.indices.length
    const uniqueVerticesCount = indexedVertices.vertices.length / 6
    const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2
    const totalIndicesSize = verticesCount * intScalarSize
    const byteStride = 6 * 4
    const totalVerticesSize = uniqueVerticesCount * byteStride
    return {
        asset: {
            version: "2.0"
        },
        scenes: [{
            nodes: [0]
        }],
        nodes: [{
            mesh: 0
        }],
        meshes: [{
            primitives: [{
                indices: 0,
                attributes: {
                    "POSITION": 1,
                    "NORMAL": 2
                }
            }]
        }],
        accessors: [{
            type: "SCALAR",
            componentType: intScalarSize == 2 ? 
                WebGLRenderingContext.UNSIGNED_SHORT : 
                WebGLRenderingContext.UNSIGNED_INT,
            bufferView: 0,
            count: verticesCount
        }, {
            type: "VEC3",
            componentType: WebGLRenderingContext.FLOAT,
            bufferView: 1,
            count: uniqueVerticesCount,
            byteOffset: 0,
            min: indexedVertices.minPos,
            max: indexedVertices.maxPos
        }, {
            type: "VEC3",
            componentType: WebGLRenderingContext.FLOAT,
            bufferView: 1,
            count: uniqueVerticesCount,
            byteOffset: byteStride / 2
        }],
        bufferViews: [{
            buffer: 0,
            byteOffset: 0,
            byteLength: totalIndicesSize
        }, {
            buffer: 0,
            byteOffset: totalIndicesSize,
            byteLength: totalVerticesSize,
            byteStride: byteStride
        }],
        buffers: [{
            uri: `./${name}.bin`,
            byteLength: totalIndicesSize + totalVerticesSize
        }]
    }
}

function createBinaryBuffer(indexedVertices: IndexedVertices) {
    const uniqueVerticesCount = indexedVertices.vertices.length / 6
    const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2
    const binaryBuffer = new ArrayBuffer(indexedVertices.indices.length * intScalarSize + indexedVertices.vertices.length * 4)
    const arrayConstructor = intScalarSize == 2 ? Uint16Array : Uint32Array
    const indicesView = new arrayConstructor(binaryBuffer, 0, indexedVertices.indices.length)
    const verticesView = new Float32Array(binaryBuffer, indicesView.byteLength)
    indicesView.set(indexedVertices.indices)
    verticesView.set(indexedVertices.vertices)
    return binaryBuffer
}

function indexVertices(vertices: Float32Array) {
    const indexedVertices: IndexedVertices = {
        indices: [],
        vertices: [],
        minPos: [2, 2, 2],
        maxPos: [-2, -2, -2]
    }
    const map: VerticesMap = {}
    const stride = 6
    for (let i = 0; i < vertices.length; i += stride) {
        const vertex = vertices.slice(i, i + stride)
        const position = vertex.slice(0, 3)
        const normal = vertex.slice(3, 6)
        const nextIndex = indexedVertices.vertices.length / stride
        let index = lookUp(map, position, nextIndex)
        if (index == nextIndex) {
            const unitNormal = ether.vec3.unit([normal[0], normal[1], normal[2]])
            indexedVertices.vertices.push(...position, ...unitNormal)
            indexedVertices.minPos = [
                Math.min(position[0], indexedVertices.minPos[0]),
                Math.min(position[1], indexedVertices.minPos[1]),
                Math.min(position[2], indexedVertices.minPos[2])
            ]
            indexedVertices.maxPos = [
                Math.max(position[0], indexedVertices.maxPos[0]),
                Math.max(position[1], indexedVertices.maxPos[1]),
                Math.max(position[2], indexedVertices.maxPos[2])
            ]
        }
        indexedVertices.indices.push(index)
    }
    return indexedVertices
}

function lookUp(map: VerticesMap, position: Float32Array | Int32Array | Int16Array | Int8Array | Uint32Array | Uint16Array | Uint8Array, defaultIndex: number) {
    let subMap: VerticesMap = map
    for (const component of position) {
        let subSubMap = subMap[component]
        if (subSubMap === undefined) {
            subSubMap = {}
            subMap[component] = subSubMap
        }
        subMap = subSubMap
    }
    if (subMap.index === undefined) {
        subMap.index = defaultIndex
    }
    return subMap.index
}
