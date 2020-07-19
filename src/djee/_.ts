/// <reference path="flattener.ts" />
/// <reference path="context.ts" />
/// <reference path="shader.ts" />
/// <reference path="program.ts" />
/// <reference path="attribute.ts" />
/// <reference path="uniform.ts" />
/// <reference path="buffer.ts" />

module Djee {
    
    export function copyOf<T>(array: T[]) {
        return array.slice();
    }
    
}