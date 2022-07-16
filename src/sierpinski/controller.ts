import { gear } from "/gen/libs.js"
import { positionDragging } from "../utils/dragging.js";

export class Controller {

    readonly showCorners: gear.Value<boolean>;
    readonly showCenters: gear.Value<boolean>;
    readonly depth: gear.Value<number>;
    readonly twist: gear.Value<number>;
    readonly scale: gear.Value<number>;
    
    constructor(
        canvasId: string,
        cornersCheckboxId: string,
        centersCheckboxId: string,
        twistCheckboxId: string,
        scaleCheckboxId: string,
        depthIncButtonId: string,
        depthDecButtonId: string
    ) {
        const canvas = gear.ElementEvents.create(canvasId);
        const depthIncButton = gear.ElementEvents.create(depthIncButtonId);
        const depthDecButton = gear.ElementEvents.create(depthDecButtonId);
        const twistEnabled = gear.checkbox(twistCheckboxId).defaultsTo(true);
        const scaleEnabled = gear.checkbox(scaleCheckboxId).defaultsTo(true);

        this.showCorners = gear.checkbox(cornersCheckboxId);
        this.showCenters = gear.checkbox(centersCheckboxId);

        const mousePos = canvas.dragging.value.then(gear.drag(positionDragging))
        this.twist = mousePos
            .map(([x, _]) => 2 * Math.PI * x)
            .then(gear.flowSwitch(twistEnabled));
        this.scale = mousePos
            .map(([_, y]) => 2 * Math.PI * y)
            .then(gear.flowSwitch(scaleEnabled));
        
        this.depth = gear.Value.from(
            depthDecButton.click.value.map(_ => -1),
            depthIncButton.click.value.map(_ => 1),
        ).reduce((delta, depth) => Math.min(Math.max(depth + delta, 1), 8), 5);
    }

}
