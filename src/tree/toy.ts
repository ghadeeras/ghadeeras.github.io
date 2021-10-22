import * as ether from "../../ether/latest/index.js";
import * as gear from "../../gear/latest/index.js"
import * as dragging from "../utils/dragging.js"
import { MatricesGenerator } from "./matgen.js";
import { renderer } from "./renderer.js";

export function init() {
    window.onload = doInit
}

async function doInit() {

    const proj = ether.mat4.projection();
    const view = ether.mat4.lookAt([-1, 4, 5], [0, 3, 0], [0, 1, 0]);
    const modelMatrix: ether.Mat<4>[] = [ether.mat4.identity()]

    renderer(proj, view, () => { 
        return rendererInputs(modelMatrix, ether.mat4.mul(proj, view));
    });

}

function rendererInputs(modelMatrix: ether.Mat<4>[], projView: ether.Mat<4>) {
    const canvas = gear.elementEvents("canvas-gl");
    const depthInc = gear.elementEvents("depth-inc");
    const depthDec = gear.elementEvents("depth-dec");

    const depth = gear.Value.from(
        depthInc.clickPos.value.map(() => +1),
        depthDec.clickPos.value.map(() => -1)
    ).reduce((inc, depth) => Math.max(Math.min(8, inc + depth), 1), 5);

    const mouseBinding = gear.readableValue("mouse-binding").defaultsTo("rotation");

    const cases = {
        rotation: new gear.Value<gear.Dragging>(),
        lightPosition: new gear.Value<gear.Dragging>(),
        color: new gear.Value<gear.Dragging>(),
        shininess: new gear.Value<gear.Dragging>(),
        fogginess: new gear.Value<gear.Dragging>(),
        twist: new gear.Value<gear.Dragging>(),
        angle: new gear.Value<gear.Dragging>(),
    };
    canvas.dragging.value.switch(mouseBinding, cases);

    const depthText = gear.text("depth");
    depthText.value = depth.map(depth => depth.toString());

    const generator = new MatricesGenerator();
    const matrices = gear.Value.from(
        depth
            .map(depth => generator.generateMatrices(depth, null)),
        cases.angle
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => Math.PI * x)
            .defaultsTo(Math.PI / 4)
            .map(angle => generator.generateMatrices(null, angle))
    );

    return {
        matrices: matrices,

        rotation: cases.rotation
            .then(gear.drag(new dragging.RotationDragging(() => modelMatrix[0], () => projView)))
            .attach(m => modelMatrix[0] = m),

        lightPosition: cases.lightPosition
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => ether.vec2.of(Math.PI * (1 - x) / 2, Math.PI * (1 - y) / 2))
            .map(([x, y]) => ether.vec3.of(4 * Math.cos(x) * Math.sin(y), 4 * Math.cos(y), 4 * Math.sin(x) * Math.sin(y))),

        color: cases.color
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => ether.vec2.of((x + 1) / 2, (y + 1) / 2)),

        shininess: cases.shininess
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => (y + 1) / 2),

        fogginess: cases.fogginess
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => (y + 1) / 2),

        twist: cases.twist
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => y),
    };
}

