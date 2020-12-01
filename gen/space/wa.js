export function module(sourceFile, caster) {
    return {
        sourceFile: sourceFile,
        caster: caster
    };
}
export function load(modules, first, ...rest) {
    const firstModule = modules[first];
    const result = fetch("/wa/" + firstModule.sourceFile, { method: "get", mode: "no-cors" })
        .then(response => response.arrayBuffer())
        .then(buffer => WebAssembly.instantiate(buffer, asImports(modules)))
        .then(waModule => firstModule.exports = firstModule.caster(waModule.instance.exports))
        .then(() => modules);
    return rest.length == 0 ? result : result.then(modules => load(modules, rest[0], ...rest.slice(1)));
}
function asImports(modules) {
    const imports = {};
    for (let key in modules) {
        imports[key] = modules[key].exports || {};
    }
    return imports;
}
//# sourceMappingURL=wa.js.map