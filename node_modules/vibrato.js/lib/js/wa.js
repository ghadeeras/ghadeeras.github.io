export const webModulesLoader = webLoadModules;
export async function webLoadModules(waPath, modulePaths) {
    const result = {};
    for (const moduleName in modulePaths) {
        const modulePath = modulePaths[moduleName];
        const response = await fetch(`${waPath}/${modulePath}`, { method: "get", mode: "no-cors" });
        const buffer = await response.arrayBuffer();
        result[moduleName] = new WebAssembly.Module(buffer);
    }
    return result;
}
export class Linker {
    constructor(modules) {
        this.modules = modules;
        this.linking = new Set();
        this.instances = {};
    }
    link(externalInstances) {
        this.linking.clear();
        this.instances = { ...externalInstances };
        for (const moduleName in this.modules) {
            this.linkModule(moduleName);
        }
        const result = this.instances;
        this.instances = {};
        return result;
    }
    linkModule(moduleName) {
        if (this.beginLinking(moduleName)) {
            const waModule = this.getModule(moduleName);
            const impDescriptors = WebAssembly.Module.imports(waModule);
            for (const descriptor of impDescriptors) {
                this.linkModule(descriptor.module);
            }
            const waInstance = new WebAssembly.Instance(waModule, this.asImports(this.instances));
            this.endLinking(moduleName, waInstance);
        }
    }
    asImports(exps) {
        const result = {};
        for (const moduleName in exps) {
            const instance = exps[moduleName];
            result[moduleName] = instance.exports;
        }
        return result;
    }
    getModule(moduleName) {
        if (!(moduleName in this.modules)) {
            throw new Error(`Module ${moduleName} not found`);
        }
        return this.modules[moduleName];
    }
    beginLinking(moduleName) {
        if (moduleName in this.instances) {
            return false;
        }
        if (this.linking.has(moduleName)) {
            throw new Error(`Circular dependency in ${this.linking}`);
        }
        this.linking.add(moduleName);
        return true;
    }
    endLinking(moduleName, waInstance) {
        this.linking.delete(moduleName);
        this.instances[moduleName] = waInstance;
    }
}
export function required(value) {
    if (!value) {
        throw new Error("Required value is null or undefined!!!");
    }
    return value;
}
