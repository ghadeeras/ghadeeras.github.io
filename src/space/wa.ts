module Space {

    export module WA {

        export type Caster<E extends WebAssembly.Exports> = (exports: WebAssembly.Exports) => E;

        export type Module<E extends WebAssembly.Exports> = {
            readonly sourceFile: string;
            readonly caster: Caster<E>;
            exports?: E; 
        }

        export type Modules = Readonly<Record<string, Module<WebAssembly.Exports>>>

        export type ModuleName<M extends Modules> = keyof M;

        export function module<E extends WebAssembly.Exports>(sourceFile: string, caster: Caster<E>): Module<E> {
            return {
                sourceFile: sourceFile,
                caster: caster
            }
        }

        export function load<M extends Modules>(modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): Promise<M> {
            const firstModule = modules[first]
            const result = fetch("/wa/" + firstModule.sourceFile, { method : "get", mode : "no-cors" })
                .then(response => response.arrayBuffer())
                .then(buffer => WebAssembly.instantiate(buffer, asImports(modules)))
                .then(waModule => firstModule.exports = firstModule.caster(waModule.instance.exports))
                .then(() => modules);
            return rest.length == 0 ? result : result.then(modules => load(modules, rest[0], ...rest.slice(1)))
        }

        function asImports<M extends Modules>(modules: M): WebAssembly.Imports {
            const imports: WebAssembly.Imports = {};
            for (let key in modules) {
                imports[key] = modules[key].exports || {};
            }
            return imports;
        }

    }

}