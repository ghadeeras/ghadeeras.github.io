import * as gear from "gear";
import { positionDragging } from "../utils/dragging.js";
export class Controller {
    constructor(canvasId, cornersCheckboxId, centersCheckboxId, twistCheckboxId, scaleCheckboxId, depthIncButtonId, depthDecButtonId) {
        const canvas = gear.ElementEvents.create(canvasId);
        const depthIncButton = gear.ElementEvents.create(depthIncButtonId);
        const depthDecButton = gear.ElementEvents.create(depthDecButtonId);
        const twistEnabled = gear.checkbox(twistCheckboxId).defaultsTo(true);
        const scaleEnabled = gear.checkbox(scaleCheckboxId).defaultsTo(true);
        this.showCorners = gear.checkbox(cornersCheckboxId);
        this.showCenters = gear.checkbox(centersCheckboxId);
        const mousePos = canvas.dragging.value.then(gear.drag(positionDragging));
        this.twist = mousePos
            .map(([x, y]) => 2 * Math.PI * x)
            .then(gear.flowSwitch(twistEnabled));
        this.scale = mousePos
            .map(([x, y]) => 2 * Math.PI * y)
            .then(gear.flowSwitch(scaleEnabled));
        ;
        this.depth = gear.Value.from(depthDecButton.click.value.map(e => -1), depthIncButton.click.value.map(e => 1)).reduce((delta, depth) => Math.min(Math.max(depth + delta, 1), 8), 5);
    }
}
//# sourceMappingURL=controller.js.map