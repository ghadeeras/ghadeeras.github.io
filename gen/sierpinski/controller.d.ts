import * as Gear from "../gear/all.js";
export declare class Controller {
    readonly showCorners: Gear.Source<boolean>;
    readonly showCenters: Gear.Source<boolean>;
    readonly depth: Gear.Source<number>;
    readonly twist: Gear.Source<number>;
    readonly scale: Gear.Source<number>;
    constructor(canvasId: string, cornersCheckboxId: string, centersCheckboxId: string, twistCheckboxId: string, scaleCheckboxId: string, depthIncButtonId: string, depthDecButtonId: string);
}
//# sourceMappingURL=controller.d.ts.map