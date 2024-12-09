import * as rt from "./rt.js";
import * as wa from "./wa.js";
import binaryen from 'binaryen';
export * from "./rt.js";
export declare function addImportsToModule(module: binaryen.Module): void;
export declare function addMemImportsToModule(module: binaryen.Module): void;
export declare function addSpaceImportsToModule(module: binaryen.Module): void;
export declare function addDelayImportsToModule(module: binaryen.Module): void;
export declare function runtime(modulesLoader?: wa.SyncModulesLoader, rawMem?: ArrayBuffer | null): rt.Runtime;
