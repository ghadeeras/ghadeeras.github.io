import fs from 'fs';
export * from "./wa.js";
export const fsModulesLoader = async (waPath, modulePaths) => fsLoadModules(waPath, modulePaths);
export const syncFsModulesLoader = (waPath, modulePaths) => fsLoadModules(waPath, modulePaths);
export function fsLoadModules(waPath, modulePaths) {
    const result = {};
    for (const moduleName in modulePaths) {
        const modulePath = modulePaths[moduleName];
        const buffer = fs.readFileSync(`${waPath}/${modulePath}`);
        result[moduleName] = new WebAssembly.Module(buffer);
    }
    return result;
}
