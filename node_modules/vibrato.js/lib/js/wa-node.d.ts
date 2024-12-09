import * as wa from "./wa.js";
export * from "./wa.js";
export declare const fsModulesLoader: wa.ModulesLoader;
export declare const syncFsModulesLoader: wa.SyncModulesLoader;
export declare function fsLoadModules<N extends string>(waPath: string, modulePaths: wa.WebAssemblyModulePaths<N>): wa.WebAssemblyModules<N>;
