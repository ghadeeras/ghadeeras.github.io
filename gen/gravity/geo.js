import { gpu } from '../djee/index.js';
export class ShaderMesh {
    constructor(device, mesh) {
        this.mesh = mesh;
        this.indexFormat = mesh.positions.length > 0xFFFF ? "uint32" : "uint16";
        this.vertexLayout = ShaderMesh.bodySurfaceVertex.asBufferLayout("vertex");
        this.indicesBuffer = device.buffer("indices", GPUBufferUsage.INDEX, gpu.dataView(this.indexFormat == "uint32"
            ? new Uint32Array(mesh.indices)
            : new Uint16Array(mesh.indices)));
        this.verticesBuffer = device.buffer("vertices", GPUBufferUsage.VERTEX, gpu.dataView(new Float32Array(mesh.positions)));
    }
}
ShaderMesh.bodySurfaceVertex = gpu.vertex({
    position: gpu.f32.x3
});
export function sphere(slices, stacks) {
    return {
        topology: "triangle-strip",
        indices: sphereIndices(stacks, slices),
        positions: spherePositions(stacks, slices)
    };
}
function sphereIndices(stacks, slices) {
    const indices = [];
    // first / north pole stack
    const northPoleIndex = 0;
    const secondStackIndex = 1;
    for (let i = 0; i < slices; i++) {
        indices.push(northPoleIndex, i + secondStackIndex);
    }
    indices.push(northPoleIndex, secondStackIndex);
    // middle stacks
    let stackIndex = secondStackIndex;
    for (let j = 1; j < stacks - 1; j++) {
        const nextStackIndex = stackIndex + slices;
        for (let i = 0; i < slices; i++) {
            indices.push(i + stackIndex, i + nextStackIndex);
        }
        indices.push(stackIndex, nextStackIndex);
        stackIndex = nextStackIndex;
    }
    // last / south pole stack
    const lastStackIndex = stackIndex;
    const southPoleIndex = lastStackIndex + slices;
    for (let i = 0; i < slices; i++) {
        indices.push(i + lastStackIndex, southPoleIndex);
    }
    indices.push(lastStackIndex, southPoleIndex);
    return indices;
}
function spherePositions(stacks, slices) {
    const stackAngle = Math.PI / stacks;
    const sliceAngle = 2 * Math.PI / slices;
    const positions = [0, 1, 0]; // north pole
    for (let j = 1; j < stacks; j++) {
        const yAngle = j * stackAngle;
        const r = Math.sin(yAngle);
        const y = Math.cos(yAngle);
        for (let i = 0; i < slices; i++) {
            const xAngle = i * sliceAngle;
            const x = r * Math.cos(xAngle);
            const z = r * Math.sin(xAngle);
            positions.push(x, y, z);
        }
    }
    positions.push(0, -1, 0); // south pole
    return positions;
}
//# sourceMappingURL=geo.js.map