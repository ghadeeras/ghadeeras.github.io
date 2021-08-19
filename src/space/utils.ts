
import * as WA from "../../vibrato.js/latest/js/wa.js"
import * as RT from "../../vibrato.js/latest/js/rt.js"

export type ScalarFieldExports = {
    tessellateTetrahedron: (contourValue: number, point0: RT.Reference, point1: RT.Reference, point2: RT.Reference, point3: RT.Reference) => RT.Reference;
    tessellateCube: (contourValue: number, point0: RT.Reference, point1: RT.Reference, point2: RT.Reference, point3: RT.Reference, point4: RT.Reference, point5: RT.Reference, point6: RT.Reference, point7: RT.Reference) => RT.Reference;
    tesselateScalarField(fieldRef: RT.Reference, resolution: number, contourValue: number): RT.Reference;
}

export const modules = {
    mem: WA.module<RT.MemExports>("vibrato.js/latest/wa/mem.wasm"),
    space: WA.module<RT.SpaceExports>("vibrato.js/latest/wa/space.wasm"),
    scalarField: WA.module<ScalarFieldExports>("wa/scalarField.wasm"),
}

export async function initWaModules() {
    return WA.loadWeb("", modules, "mem", "space", "scalarField");
}
