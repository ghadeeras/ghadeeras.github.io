export type WebAssemblyModulePaths<N extends string> = Record<N, string>;
export type WebAssemblyModules<N extends string> = Record<N, WebAssembly.Module>;
export type WebAssemblyInstance = Pick<WebAssembly.Instance, any>;
export type WebAssemblyInstances<N extends string> = Record<N, WebAssemblyInstance>;
export type ModulesLoader = <N extends string>(waPath: string, modulePaths: WebAssemblyModulePaths<N>) => Promise<WebAssemblyModules<N>>;
export type SyncModulesLoader = <N extends string>(waPath: string, modulePaths: WebAssemblyModulePaths<N>) => WebAssemblyModules<N>;
export declare const webModulesLoader: ModulesLoader;
export declare function webLoadModules<N extends string>(waPath: string, modulePaths: WebAssemblyModulePaths<N>): Promise<WebAssemblyModules<N>>;
export declare class Linker<N extends string> {
    private modules;
    private linking;
    private instances;
    constructor(modules: WebAssemblyModules<N>);
    link<E extends string>(externalInstances: WebAssemblyInstances<E>): WebAssemblyInstances<N | E>;
    private linkModule;
    asImports(exps: WebAssemblyInstances<string>): WebAssembly.Imports;
    private getModule;
    private beginLinking;
    private endLinking;
}
export declare function required<T>(value: T | null | undefined): T;
