import * as Gear from "../gear/all.js";
export declare class Renderer {
    private context;
    private buffer;
    private matModel;
    private matSubModel;
    private matView;
    private matProjection;
    private lightPosition;
    private color;
    private shininess;
    private fogginess;
    private twist;
    private matrices;
    constructor(vertexShaderCode: string, fragmentShaderCode: string, matrices: number[][]);
    matricesSink(): Gear.Sink<number[][]>;
    rotationSink(): Gear.Sink<Gear.PointerPosition>;
    lightPositionSink(): Gear.Sink<Gear.PointerPosition>;
    colorSink(): Gear.Sink<Gear.PointerPosition>;
    shininessSink(): Gear.Sink<number>;
    fogginessSink(): Gear.Sink<number>;
    twistSink(): Gear.Sink<number>;
    private draw;
    private vertexData;
}
//# sourceMappingURL=renderer.d.ts.map