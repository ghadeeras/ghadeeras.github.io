import * as Gear from "../gear/all.js";
import { FlattenedSierpinski } from "./model.js";
export declare class View {
    private readonly context;
    private readonly vertexShader;
    private readonly fragmentShader;
    private readonly program;
    private readonly shaderPosition;
    private readonly shaderTwist;
    private readonly shaderScale;
    private readonly cornersBuffer;
    private readonly centersBuffer;
    private mustShowCorners;
    private mustShowCenters;
    private stride;
    readonly sierpinsky: Gear.Sink<FlattenedSierpinski>;
    readonly showCorners: Gear.Sink<boolean>;
    readonly showCenters: Gear.Sink<boolean>;
    readonly depth: Gear.Sink<number>;
    readonly twist: Gear.Sink<number>;
    readonly scale: Gear.Sink<number>;
    constructor(canvasId: string, depthId: string, twistId: string, scaleId: string);
    private source;
    private setSierpinski;
    private setTwist;
    private setScale;
    private setShowCorners;
    private setShowCenters;
    private draw;
}
//# sourceMappingURL=view.d.ts.map