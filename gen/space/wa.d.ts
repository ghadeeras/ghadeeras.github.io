export declare type Caster<E extends WebAssembly.Exports> = (exports: WebAssembly.Exports) => E;
export declare type Module<E extends WebAssembly.Exports> = {
    readonly sourceFile: string;
    readonly caster: Caster<E>;
    exports?: E;
};
export declare type Modules = Readonly<Record<string, Module<WebAssembly.Exports>>>;
export declare type ModuleName<M extends Modules> = keyof M;
export declare function module<E extends WebAssembly.Exports>(sourceFile: string, caster: Caster<E>): Module<E>;
export declare function load<M extends Modules>(modules: M, first: ModuleName<M>, ...rest: ModuleName<M>[]): Promise<M>;
//# sourceMappingURL=wa.d.ts.map