
import { Vector } from "./vector.js"
import { Matrix } from "./matrix.js"
import * as WA from "./wa.js"

export function vec(...coordinates: number[]) {
    return new Vector(coordinates);
}

export function mat(...columns: Vector[]) {
    return new Matrix(columns);
}

export type Reference = number;

export type StackExports = {
    
    stack: WebAssembly.Memory;

    enter: () => void;
    leave: () => void;
    
    allocate8: (size: number) => Reference;
    allocate16: (size: number) => Reference;
    allocate32: (size: number) => Reference;
    allocate64: (size: number) => Reference;

}

export type SpaceExports = {

    f64_vec2: (x: number, y: number) => Reference;
    f64_vec3: (x: number, y: number, z: number) => Reference;
    f64_vec4: (x: number, y: number, z: number, w: number) => Reference;

}

export type ScalarFieldExports = {
    tessellateTetrahedron: (contourValue: number, point0: Reference, point1: Reference, point2: Reference, point3: Reference) => Reference;
    tessellateCube: (contourValue: number, point0: Reference, point1: Reference, point2: Reference, point3: Reference, point4: Reference, point5: Reference, point6: Reference, point7: Reference) => Reference;
    tesselateScalarField(fieldRef: Reference, resolution: number, contourValue: number): Reference;
}

export const modules = {
    stack: WA.module("stack.wasm", exports => exports as StackExports),
    space: WA.module("space.wasm", exports => exports as SpaceExports),
    scalarField: WA.module("scalarField.wasm", exports => exports as ScalarFieldExports),
}

export function initWaModules(onready: () => void) {
    WA.load(modules, "stack", "space", "scalarField").then(() => onready());
}
