import * as Gear from "../gear/all.js";
export declare type ProgramSample = {
    name: string;
    vertexShader: string;
    fragmentShader: string;
};
export declare const samples: ProgramSample[];
export declare function loadShaders(sample: ProgramSample, consumer: Gear.Consumer<ProgramSample>): void;
//# sourceMappingURL=samples.d.ts.map