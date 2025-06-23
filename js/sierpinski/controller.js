import * as oldGear from "../utils/legacy/gear/index.js";
import { positionDragging } from "../utils/dragging.js";
export class Controller {
    constructor(canvasId, cornersCheckboxId, centersCheckboxId, twistCheckboxId, scaleCheckboxId, depthIncButtonId, depthDecButtonId) {
        const canvas = oldGear.ElementEvents.create(canvasId);
        const depthIncButton = oldGear.ElementEvents.create(depthIncButtonId);
        const depthDecButton = oldGear.ElementEvents.create(depthDecButtonId);
        const twistEnabled = oldGear.checkbox(twistCheckboxId).defaultsTo(true);
        const scaleEnabled = oldGear.checkbox(scaleCheckboxId).defaultsTo(true);
        this.showCorners = oldGear.checkbox(cornersCheckboxId);
        this.showCenters = oldGear.checkbox(centersCheckboxId);
        const mousePos = canvas.dragging.value.then(oldGear.drag(positionDragging));
        this.twist = mousePos
            .map(([x, _]) => 2 * Math.PI * x)
            .then(oldGear.flowSwitch(twistEnabled));
        this.scale = mousePos
            .map(([_, y]) => 2 * Math.PI * y)
            .then(oldGear.flowSwitch(scaleEnabled));
        this.depth = oldGear.Value.from(depthDecButton.click.value.map(_ => -1), depthIncButton.click.value.map(_ => 1)).reduce((delta, depth) => Math.min(Math.max(depth + delta, 1), 8), 5);
    }
}
//# sourceMappingURL=controller.js.map