import * as Space from "../space/all.js";
export declare class View {
    private julia;
    private context;
    private uniformCenter;
    private uniformScale;
    private uniformColor;
    private uniformIntensity;
    private uniformPalette;
    private uniformJuliaNumber;
    private drawCall;
    constructor(julia: boolean, _canvasId: string, _vertexShaderCode: string, _fragmentShaderCode: string, _center?: Space.Vector, _scale?: number);
    get center(): Space.Vector;
    set center(c: Space.Vector);
    get scale(): number;
    set scale(s: number);
    get hue(): number;
    set hue(h: number);
    get saturation(): number;
    set saturation(s: number);
    setColor(h: number, s: number): void;
    get intensity(): number;
    set intensity(i: number);
    get palette(): number;
    set palette(p: number);
    get juliaNumber(): Space.Vector;
    set juliaNumber(j: Space.Vector);
    private draw;
    private doDraw;
}
//# sourceMappingURL=view.d.ts.map