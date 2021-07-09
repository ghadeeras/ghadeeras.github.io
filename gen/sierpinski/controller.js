import * as Gear from "../gear/all.js";
export class Controller {
    constructor(canvasId, cornersCheckboxId, centersCheckboxId, twistCheckboxId, scaleCheckboxId, depthIncButtonId, depthDecButtonId) {
        const canvas = Gear.ElementEvents.create(canvasId);
        const depthIncButton = Gear.ElementEvents.create(depthIncButtonId);
        const depthDecButton = Gear.ElementEvents.create(depthDecButtonId);
        const twistEnabled = Gear.checkbox(twistCheckboxId);
        const scaleEnabled = Gear.checkbox(scaleCheckboxId);
        this.showCorners = Gear.checkbox(cornersCheckboxId);
        this.showCenters = Gear.checkbox(centersCheckboxId);
        const dragEnabled = canvas.mouseButtons.map(([l, m, r]) => l || m || r);
        const mousePos = Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(dragEnabled)), canvas.touchPos.map(ps => ps[0])).defaultsTo([canvas.element.clientWidth / 2, canvas.element.clientHeight / 4]);
        this.twist = mousePos
            .map(([x, y]) => Math.PI * (4 * x / canvas.element.clientWidth - 2))
            .then(Gear.flowSwitch(twistEnabled));
        this.scale = mousePos
            .map(([x, y]) => 2 - 4 * y / canvas.element.clientHeight)
            .then(Gear.flowSwitch(scaleEnabled));
        ;
        this.depth = Gear.Flow.from(depthDecButton.clickPos.map(e => -1), depthIncButton.clickPos.map(e => 1)).reduce((delta, depth) => Math.min(Math.max(depth + delta, 1), 8), 5);
    }
}
//# sourceMappingURL=controller.js.map