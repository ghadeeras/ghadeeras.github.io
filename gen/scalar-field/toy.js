var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as ether from "../../ether/latest/index.js";
import * as gear from "../../gear/latest/index.js";
import * as v from "./view.js";
import * as dragging from "../utils/dragging.js";
import { required } from "../utils/misc.js";
const twoPi = 2 * Math.PI;
const viewMatrix = ether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0]);
const projectionMatrix = ether.mat4.projection(Math.pow(2, 1.5));
export function init() {
    window.onload = () => doInit();
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const wa = yield ether.initWaModules();
        const view = yield v.newView("canvas-gl");
        view.matView = viewMatrix;
        view.matProjection = projectionMatrix;
        const toy = new Toy(view, required(wa.mem.exports), required(wa.space.exports), required(wa.scalarField.exports));
    });
}
class Toy {
    constructor(view, mem, space, scalarField) {
        this.fieldSampler = xyz;
        this.resolution = 64;
        this.contourValue = 0;
        this.fieldRef = 0;
        this.meshComputer = new gear.DeferredComputation(() => this.contourSurfaceData());
        this.modules = { mem, space, scalarField };
        this.fieldRef = this.sampleField();
        const canvas = gear.elementEvents("canvas-gl");
        const rotationDragging = new dragging.RotationDragging(() => view.matPositions, () => ether.mat4.mul(view.matProjection, view.matView), 4);
        const focalRatioDragging = new dragging.RatioDragging(() => view.matProjection[0][0]);
        const cases = {
            contourValue: gear.Value.from(),
            rotation: gear.Value.from(),
            focalRatio: gear.Value.from(),
            shininess: gear.Value.from(),
            fogginess: gear.Value.from(),
            lightPosition: gear.Value.from(),
            lightRadius: gear.Value.from(),
        };
        canvas.dragging.value.switch(gear.readableValue("mouse-binding").defaultsTo("rotation"), cases);
        const contourValue = cases.contourValue
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => y)
            .defaultsTo(0.01);
        const resolution = this.levelOfDetails();
        v.wire(view, {
            matModel: cases.rotation
                .then(gear.drag(rotationDragging))
                .defaultsTo(rotationDragging.currentValue()),
            matView: gear.Value.from()
                .defaultsTo(view.matView),
            matProjection: cases.focalRatio
                .then(gear.drag(focalRatioDragging))
                .defaultsTo(focalRatioDragging.currentValue())
                .map(ratio => ether.mat4.projection(ratio)),
            color: contourValue
                .map(v => this.fieldColor(v)),
            shininess: cases.shininess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(view.shininess),
            fogginess: cases.fogginess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(view.fogginess),
            lightPosition: cases.lightPosition
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => ether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
                .map(p => ether.vec2.length(p) > 1 ? ether.vec2.unit(p) : p)
                .map(([x, y]) => ether.vec4.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1))
                .defaultsTo(ether.vec4.of(0, 0, 2, 1)),
            lightRadius: cases.lightRadius
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(0.1),
            vertices: gear.Value.from(resolution.then((r, c) => this.contourSurfaceDataForResolution(r, c)), contourValue.then((v, c) => this.contourSurfaceDataForValue(v, c)), gear.readableValue("function").defaultsTo("xyz").then((f, c) => this.contourSurfaceDataForFunction(f, c)))
        });
        gear.text("lod").value = resolution.map(lod => lod.toString());
        gear.elementEvents("save").click.value.attach(() => this.saveModel());
    }
    levelOfDetails() {
        const inc = gear.elementEvents("lod-inc").click.value.map(() => +8);
        const dec = gear.elementEvents("lod-dec").click.value.map(() => -8);
        const flow = gear.Value.from(inc, dec).reduce((i, lod) => this.clamp(lod + i, 32, 96), 64);
        return flow;
    }
    clamp(n, min, max) {
        return n < min ? min : (n > max ? max : n);
    }
    fieldColor(contourValue = this.contourValue) {
        return contourValue > 0 ?
            [1, 0, (1 - contourValue) / (1 + contourValue), 1] :
            [1 - (1 + contourValue) / (1 - contourValue), 1, 0, 1];
    }
    getFieldFunction(functionName) {
        switch (functionName) {
            case "xyz": return xyz;
            case "envelopedCosine": return envelopedCosine;
            default: return xyz;
        }
    }
    sampleField() {
        if (!this.modules.mem || !this.modules.space) {
            throw new Error("Failed to initialize Web Assembly Ether modules!");
        }
        this.modules.mem.leave();
        this.modules.mem.leave();
        this.modules.mem.enter();
        const length = 8 * Math.pow((this.resolution + 1), 3);
        const ref = this.modules.mem.allocate64(length);
        const view = new Float64Array(this.modules.mem.stack.buffer, ref, length);
        let i = 0;
        for (let z = 0; z <= this.resolution; z++) {
            for (let y = 0; y <= this.resolution; y++) {
                for (let x = 0; x <= this.resolution; x++) {
                    const px = 2 * x / this.resolution - 1;
                    const py = 2 * y / this.resolution - 1;
                    const pz = 2 * z / this.resolution - 1;
                    const v = this.fieldSampler(px, py, pz);
                    view[i++] = px;
                    view[i++] = py;
                    view[i++] = pz;
                    view[i++] = 1;
                    view[i++] = v[0];
                    view[i++] = v[1];
                    view[i++] = v[2];
                    view[i++] = v[3];
                }
            }
        }
        this.modules.mem.enter();
        return ref;
    }
    contourSurfaceDataForValue(value, meshConsumer) {
        this.contourValue = value;
        this.meshComputer.perform().then(meshConsumer);
    }
    contourSurfaceDataForResolution(resolution, meshConsumer) {
        this.resolution = resolution;
        this.fieldRef = this.sampleField();
        this.meshComputer.perform().then(meshConsumer);
    }
    contourSurfaceDataForFunction(functionName, meshConsumer) {
        this.fieldSampler = this.getFieldFunction(functionName);
        this.fieldRef = this.sampleField();
        this.meshComputer.perform().then(meshConsumer);
    }
    contourSurfaceData() {
        if (!this.modules.mem || !this.modules.scalarField) {
            throw new Error("Failed to initialize Web Assembly Ether modules!");
        }
        this.modules.mem.leave();
        this.modules.mem.enter();
        const begin = this.modules.scalarField.tesselateScalarField(this.fieldRef, this.resolution, this.contourValue);
        const end = this.modules.mem.allocate8(0);
        const result = new Float32Array(this.modules.mem.stack.buffer, begin, (end - begin) / 4);
        return result;
    }
    saveModel() {
        return __awaiter(this, void 0, void 0, function* () {
            const model = this.createModel("ScalarField");
            const anchor1 = document.createElement("a");
            anchor1.href = URL.createObjectURL(new Blob([JSON.stringify(model.model)]));
            anchor1.type = 'text/json';
            anchor1.target = '_blank';
            anchor1.download = 'ScalarField.gltf';
            anchor1.click();
            const anchor2 = document.createElement("a");
            anchor2.href = URL.createObjectURL(new Blob([model.binary]));
            anchor2.type = 'application/gltf-buffer';
            anchor2.target = '_blank';
            anchor2.download = 'ScalarField.bin';
            anchor2.click();
            const anchor3 = document.createElement("a");
            const canvas = document.getElementById("canvas-gl");
            anchor3.href = canvas.toDataURL("image/png");
            anchor3.type = 'image/png';
            anchor3.target = '_blank';
            anchor3.download = 'ScalarField.png';
            anchor3.click();
        });
    }
    createModel(name) {
        const indexedVertices = this.indexVertices(this.contourSurfaceData());
        return {
            model: this.createModelJson(name, indexedVertices),
            binary: this.createBinaryBuffer(indexedVertices)
        };
    }
    createModelJson(name, indexedVertices) {
        const verticesCount = indexedVertices.indices.length;
        const uniqueVerticesCount = indexedVertices.vertices.length / 6;
        const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2;
        const totalIndicesSize = verticesCount * intScalarSize;
        const byteStride = 6 * 4;
        const totalVerticesSize = uniqueVerticesCount * byteStride;
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
        };
    }
    createBinaryBuffer(indexedVertices) {
        const uniqueVerticesCount = indexedVertices.vertices.length / 6;
        const intScalarSize = uniqueVerticesCount > 0xFFFF ? 4 : 2;
        const binaryBuffer = new ArrayBuffer(indexedVertices.indices.length * intScalarSize + indexedVertices.vertices.length * 4);
        const arrayConstructor = intScalarSize == 2 ? Uint16Array : Uint32Array;
        const indicesView = new arrayConstructor(binaryBuffer, 0, indexedVertices.indices.length);
        const verticesView = new Float32Array(binaryBuffer, indicesView.byteLength);
        indicesView.set(indexedVertices.indices);
        verticesView.set(indexedVertices.vertices);
        return binaryBuffer;
    }
    indexVertices(vertices) {
        const indexedVertices = {
            indices: [],
            vertices: [],
            minPos: [2, 2, 2],
            maxPos: [-2, -2, -2]
        };
        const map = {};
        const stride = 6;
        for (let i = 0; i < vertices.length; i += stride) {
            const vertex = vertices.slice(i, i + stride);
            const position = vertex.slice(0, 3);
            const normal = vertex.slice(3, 6);
            const nextIndex = indexedVertices.vertices.length / stride;
            let index = this.lookUp(map, position, nextIndex);
            if (index == nextIndex) {
                const unitNormal = ether.vec3.unit([normal[0], normal[1], normal[2]]);
                indexedVertices.vertices.push(...position, ...unitNormal);
                indexedVertices.minPos = [
                    Math.min(position[0], indexedVertices.minPos[0]),
                    Math.min(position[1], indexedVertices.minPos[1]),
                    Math.min(position[2], indexedVertices.minPos[2])
                ];
                indexedVertices.maxPos = [
                    Math.max(position[0], indexedVertices.maxPos[0]),
                    Math.max(position[1], indexedVertices.maxPos[1]),
                    Math.max(position[2], indexedVertices.maxPos[2])
                ];
            }
            indexedVertices.indices.push(index);
        }
        return indexedVertices;
    }
    lookUp(map, position, defaultIndex) {
        let subMap = map;
        for (const component of position) {
            let subSubMap = subMap[component];
            if (subSubMap === undefined) {
                subSubMap = {};
                subMap[component] = subSubMap;
            }
            subMap = subSubMap;
        }
        if (subMap.index === undefined) {
            subMap.index = defaultIndex;
        }
        return subMap.index;
    }
}
function xyz(x, y, z) {
    return [
        y * z,
        z * x,
        x * y,
        x * y * z
    ];
}
function envelopedCosine(x, y, z) {
    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
        const piX2 = Math.PI * x2;
        const piY2 = Math.PI * y2;
        const piZ2 = Math.PI * z2;
        const envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8;
        const piX = Math.PI * x;
        const piY = Math.PI * y;
        const piZ = Math.PI * z;
        const value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ);
        const dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4;
        const dValueDX = -twoPi * Math.sin(2 * piX);
        const dValueDY = -twoPi * Math.sin(2 * piY);
        const dValueDZ = -twoPi * Math.sin(2 * piZ);
        return [
            dEnvelopeDX * value + envelope * dValueDX,
            dEnvelopeDY * value + envelope * dValueDY,
            dEnvelopeDZ * value + envelope * dValueDZ,
            envelope * value / 3
        ];
    }
    else {
        return [0, 0, 0, 0];
    }
}
//# sourceMappingURL=toy.js.map