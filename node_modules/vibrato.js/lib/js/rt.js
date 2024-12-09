import * as wa from "./wa.js";
export function runtimeModulePaths() {
    return {
        rawMem: "rawMem.wasm",
        mem: "mem.wasm",
        space: "space.wasm",
        delay: "delay.wasm",
    };
}
export async function runtime(waPath = import.meta.url + "/../../wa", modulesLoader = wa.webModulesLoader, rawMem = null) {
    const modules = await loadRuntimeModules(waPath, modulesLoader);
    return createRuntime(rawMem, modules);
}
export function createRuntime(rawMem, modules) {
    if (rawMem) {
        modules.rawMem = new WebAssembly.Module(rawMem);
    }
    return linkRuntime(modules);
}
export async function loadRuntimeModules(waPath, modulesLoader = wa.webModulesLoader) {
    return await modulesLoader(waPath, runtimeModulePaths());
}
export function linkRuntime(modules) {
    const linker = new wa.Linker(modules);
    const instances = linker.link({});
    return {
        modules: modules,
        instances: instances,
        exports: {
            rawMem: instances.rawMem.exports,
            mem: instances.mem.exports,
            space: instances.space.exports,
            delay: instances.delay.exports,
        }
    };
}
