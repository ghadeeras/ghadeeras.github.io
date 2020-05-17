/// <reference path="vector.ts" />
/// <reference path="matrix.ts" />
/// <reference path="wa.ts" />

module Space {
    
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

        vec2: (x: number, y: number) => Reference;
        vec3: (x: number, y: number, z: number) => Reference;
        vec4: (x: number, y: number, z: number, w: number) => Reference;

        vec2Clone: (v: Reference) => Reference;
        vec3Clone: (v: Reference) => Reference;
        vec4Clone: (v: Reference) => Reference;

        vec2Swizzle: (v: Reference, x: number, y: number) => Reference;
        vec3Swizzle: (v: Reference, x: number, y: number, z: number) => Reference;
        vec4Swizzle: (v: Reference, x: number, y: number, z: number, w: number) => Reference;

        vecX: (v: Reference) => number;
        vecY: (v: Reference) => number;
        vecZ: (v: Reference) => number;
        vecW: (v: Reference) => number;

        vec2Add: (v1: Reference, v2: Reference) => Reference;
        vec3Add: (v1: Reference, v2: Reference) => Reference;
        vec4Add: (v1: Reference, v2: Reference) => Reference;

        vec2Sub: (v1: Reference, v2: Reference) => Reference;
        vec3Sub: (v1: Reference, v2: Reference) => Reference;
        vec4Sub: (v1: Reference, v2: Reference) => Reference;
        
        vec2Scale: (v1: Reference, factor: number) => Reference;
        vec3Scale: (v1: Reference, factor: number) => Reference;
        vec4Scale: (v1: Reference, factor: number) => Reference;
        
        vec2Dot: (v1: Reference, v2: Reference) => number;
        vec3Dot: (v1: Reference, v2: Reference) => number;
        vec4Dot: (v1: Reference, v2: Reference) => number;
        
        vec2Cross: (v1: Reference, v2: Reference) => number;
        vec3Cross: (v1: Reference, v2: Reference) => Reference;

        vec2LengthSquared: (v: Reference) => number;
        vec3LengthSquared: (v: Reference) => number;
        vec4LengthSquared: (v: Reference) => number;

        vec2Length: (v: Reference) => number;
        vec3Length: (v: Reference) => number;
        vec4Length: (v: Reference) => number;

        vec2Unit: (v: Reference) => Reference;
        vec3Unit: (v: Reference) => Reference;
        vec4Unit: (v: Reference) => Reference;

    }

    export const modules = {
        stack: WA.module("stack.wasm", exports => exports as StackExports),
        space: WA.module("space.wasm", exports => exports as SpaceExports),
    }

    export function initWaModules(onready: () => void) {
        WA.load(modules, "stack", "space").then(() => onready());
    }

}