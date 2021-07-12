import * as Djee from "../djee/all.js"
import * as Space from "../space/all.js"
import * as Gear from "../gear/all.js"
import * as gltf from "../djee/gltf.js"

type FieldSampler = (x: number, y: number, z: number) => Space.Vector

let resolution = 64
let fieldSampler: FieldSampler = envelopedCosine

let vertexShaderCode: string
let fragmentShaderCode: string

let context: Djee.Context

let position: Djee.Attribute
let normal: Djee.Attribute

let matModel: Djee.Uniform
let matProjection: Djee.Uniform
let lightPosition: Djee.Uniform
let color: Djee.Uniform
let shininess: Djee.Uniform
let fogginess: Djee.Uniform

let contourSurfaceBuffer: Djee.Buffer

let contourValue: number = 0
let fieldRef: number = 0

export function init() {
    window.onload = () => Gear.load("/shaders", () => Space.initWaModules(() => doInit()),
        ["uniformColors.vert", shader => vertexShaderCode = shader],
        ["uniformColors.frag", shader => fragmentShaderCode = shader]
    )
}

const viewMatrix = Space.Matrix.globalView(Space.vec(-2, 2, 10), Space.vec(0, 0, 0), Space.vec(0, 1, 0))
const projectionMatrix = Space.Matrix.project(4, 100, 1)

function doInit() {
    fieldRef = sampleField()

    context = Djee.Context.of("canvas-gl")

    const program = context.link(
        context.vertexShader(vertexShaderCode),
        context.fragmentShader(fragmentShaderCode)
    )
    program.use()

    contourSurfaceBuffer = context.newBuffer(6 * 4)

    position = program.attribute("position")
    normal = program.attribute("normal")

    matModel = program.uniform("matModel")
    const matView = program.uniform("matView")
    matProjection = program.uniform("matProjection")

    lightPosition = program.uniform("lightPosition")
    color = program.uniform("color")
    shininess = program.uniform("shininess")
    fogginess = program.uniform("fogginess")

    matModel.data = Space.Matrix.identity().asColumnMajorArray
    matView.data = viewMatrix.asColumnMajorArray
    matProjection.data = projectionMatrix.asColumnMajorArray

    const gl = context.gl
    gl.enable(gl.DEPTH_TEST)
    gl.clearDepth(1)
    gl.clearColor(1, 1, 1, 1)

    const canvas = Gear.elementEvents("canvas-gl")
    const transformer = new Gear.Transformer(canvas.element, projectionMatrix.by(viewMatrix))
    canvas.dragging.branch(
        flow => flow.map(d => d.pos).map(([x, y]) => Gear.pos(
            2 * (x - canvas.element.clientWidth / 2 ) / canvas.element.clientWidth, 
            2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
        )).branch(
            flow => flow.filter(selected("focalRatio")).map(([x, y]) => y).to(focalRatioSink()),
            flow => flow.filter(selected("lightPosition")).to(lightPositionSink()),
            flow => flow.filter(selected("contourValue")).map(([x, y]) => y).defaultsTo(0.01).to(contourValueSink()),
            flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(shininessSink()),
            flow => flow.filter(selected("fogginess")).map(([x, y]) => y).to(fogginessSink()),
        ),
        flow => flow
            .filter(selected("rotation"))
            .map(transformer.rotation)
            .to(rotationSink())
    )
    levelOfDetailsFlow().to(levelOfDetailsSink())
    Gear.readableValue("function").to(functionSink())

    Gear.elementEvents("save").click.producer(saveModel)
}

function selected<T>(value: string): Gear.Predicate<T> {
    const mouseBinding = document.getElementById("mouse-binding") as HTMLInputElement
    return () => mouseBinding.value == value
}

function levelOfDetailsFlow() {
    const inc = Gear.elementEvents("lod-inc").mouseButtons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? +8 : 0)
    const dec = Gear.elementEvents("lod-dec").mouseButtons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? -8 : 0)
    const flow = Gear.Flow.from(inc, dec)
        .defaultsTo(0)
        .then(Gear.repeater(128, 0))
        .reduce((i, lod) => clamp(lod + i, 32, 96), 64)
    flow.map(lod => lod.toString()).to(Gear.text("lod"))
    return flow
}

function clamp(n: number, min: number, max: number) {
    return n < min ? min : (n > max ? max : n)
}

function levelOfDetailsSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(64)
        .producer(lod => {
            resolution = lod
            fieldRef = sampleField()
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue)
            draw()
        })
    )
}

function contourValueSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
            contourValue = newContourValue
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue)
            color.data = fieldColor(contourValue, 1).coordinates
            draw()
        })
    )
}

function fieldColor(fieldValue: number, alpha: number = 0.4): Space.Vector {
    return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha)
}

function rotationSink(): Gear.Sink<Space.Matrix> {
    return Gear.sinkFlow(flow => flow.defaultsTo(Space.Matrix.identity()).producer(matrix => {
        matModel.data = matrix.asColumnMajorArray
        draw()
    }))
}

function focalRatioSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow.defaultsTo(0).map(ratio => (ratio + 1.4) * 3).producer(ratio => {
        matProjection.data = Space.Matrix.project(ratio, 100, 1).asColumnMajorArray
        draw()
    }))
}

function lightPositionSink(): Gear.Sink<Gear.PointerPosition> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo([0.5, 0.5])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
            lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)]
            draw()
        })
    )
}

function shininessSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            shininess.data = [value]
            draw()
        })
    )
}

function fogginessSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            fogginess.data = [value]
            draw()
        })
    )
}

function functionSink(): Gear.Sink<string> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo("xyz")
        .producer(functionName => {
            fieldSampler = getFieldFunction(functionName)
            fieldRef = sampleField()
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue)
            draw()
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

function sampleField(): number {
    const stack = Space.modules.stack.exports
    const space = Space.modules.space.exports
    if (!stack || !space) {
        throw new Error("Failed to initialize Web Assembly Space modules!")
    }
    stack.leave()

    stack.leave()
    stack.enter()
    const ref = stack.allocate8(0)
    for (let z = 0; z <= resolution; z++) {
        for (let y = 0; y <= resolution; y++) {
            for (let x = 0; x <= resolution; x++) {
                const px = 2 * x / resolution - 1
                const py = 2 * y / resolution - 1
                const pz = 2 * z / resolution - 1
                const v = fieldSampler(px, py, pz).coordinates
                space.vec4(px, py, pz, 1)
                space.vec4(v[0], v[1], v[2], v[3])
            }
        }
    }
    stack.enter()
    return ref
}

function contourSurfaceData(fieldRef: number, contourValue: number): Float32Array {
    const stack = Space.modules.stack.exports
    const scalarField = Space.modules.scalarField.exports
    if (!stack || !scalarField) {
        throw new Error("Failed to initialize Web Assembly Space modules!")
    }
    stack.leave()
    stack.enter()
    const begin = scalarField.tesselateScalarField(fieldRef, resolution, contourValue)
    const end = stack.allocate8(0)
    const result = new Float32Array(new Float64Array(stack.stack.buffer, begin, (end - begin) / 8))
    return result
}

const twoPi = 2 * Math.PI

function xyz(x: number, y: number, z: number): Space.Vector {
    return Space.vec(
        y * z,
        z * x,
        x * y,
        x * y * z
    )
}

function envelopedCosine(x: number, y: number, z: number): Space.Vector {
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

        return Space.vec(
            dEnvelopeDX * value + envelope * dValueDX,
            dEnvelopeDY * value + envelope * dValueDY,
            dEnvelopeDZ * value + envelope * dValueDZ,
            envelope * value / 3
        )
    } else {
        return Space.vec(0, 0, 0, 0)
    }
}

function draw() {
    const gl = context.gl
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    position.pointTo(contourSurfaceBuffer, 0 * contourSurfaceBuffer.word)
    normal.pointTo(contourSurfaceBuffer, 3 * contourSurfaceBuffer.word)
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6)

    gl.flush()
}

function saveModel() {
    const model = createModel("ScalarField")

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

function createModel(name: string): ModelAndBinary {
    const indexedVertices: IndexedVertices = indexVertices(contourSurfaceBuffer)
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
    const totalVerticesSize = uniqueVerticesCount * contourSurfaceBuffer.byteStride
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
            byteOffset: contourSurfaceBuffer.byteStride / 2
        }],
        bufferViews: [{
            buffer: 0,
            byteOffset: 0,
            byteLength: totalIndicesSize
        }, {
            buffer: 0,
            byteOffset: totalIndicesSize,
            byteLength: totalVerticesSize,
            byteStride: contourSurfaceBuffer.byteStride
        }],
        buffers: [{
            uri: `./${name}.bin`,
            byteLength: totalIndicesSize + totalVerticesSize
        }]
    }
}

function createBinaryBuffer(indexedVertices: IndexedVertices) {
    const intScalarSize = indexedVertices.vertices.length > 0xFFFF ? 4 : 2
    const totalIndicesSize = indexedVertices.indices.length * intScalarSize
    const totalVerticesSize = indexedVertices.vertices.length * contourSurfaceBuffer.byteStride
    const binaryBuffer = new ArrayBuffer(indexedVertices.indices.length * intScalarSize + indexedVertices.vertices.length * 4)
    const arrayConstructor = intScalarSize == 2 ? Uint16Array : Uint32Array
    const indicesView = new arrayConstructor(binaryBuffer, 0, indexedVertices.indices.length)
    const verticesView = new Float32Array(binaryBuffer, indicesView.byteLength)
    indicesView.set(indexedVertices.indices)
    verticesView.set(indexedVertices.vertices)
    return binaryBuffer
}

function indexVertices(buffer: Djee.Buffer) {
    const indexedVertices: IndexedVertices = {
        indices: [],
        vertices: [],
        minPos: [2, 2, 2],
        maxPos: [-2, -2, -2]
    }
    const map: VerticesMap = {}
    const stride = buffer.byteStride / buffer.data.BYTES_PER_ELEMENT
    for (let i = 0; i < buffer.data.length; i += stride) {
        const vertex = buffer.data.slice(i, i + stride)
        const position = vertex.slice(0, 3)
        const normal = vertex.slice(3, 6)
        const nextIndex = indexedVertices.vertices.length / stride
        let index = lookUp(map, position, nextIndex)
        if (index == nextIndex) {
            const unitNormal = Space.vec(...normal).unit.coordinates
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
