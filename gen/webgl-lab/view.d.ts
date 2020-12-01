import * as Gear from "../gear/all.js";
import { ProgramSample } from "./samples.js";
export declare type Named = {
    name: string;
};
export declare class View {
    private context;
    private buffer;
    private program;
    private defaultSample;
    private lod;
    private mode;
    private cullingEnabled;
    private programScalars;
    private xScalar;
    private yScalar;
    constructor(convasId: string, samples: ProgramSample[]);
    get mesh(): Gear.Supplier<Gear.Sink<boolean>>;
    get levelOfDetail(): Gear.Supplier<Gear.Sink<number>>;
    get compiler(): Gear.Supplier<Gear.Sink<ProgramSample>>;
    get editor(): Gear.Supplier<Gear.Sink<ProgramSample>>;
    get xBinding(): Gear.Supplier<Gear.Sink<number>>;
    get yBinding(): Gear.Supplier<Gear.Sink<number>>;
    get xy(): Gear.Supplier<Gear.Sink<[number, number]>>;
    private recompile;
    private setValue;
    private reflectOn;
    private toScalars;
    private resetBuffer;
    private draw;
}
//# sourceMappingURL=view.d.ts.map