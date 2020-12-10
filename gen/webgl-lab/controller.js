import * as Gear from "../gear/all.js";
export class Controller {
    get program() {
        return Gear.lazy(() => programFlow());
    }
    get mesh() {
        return Gear.lazy(() => Gear.checkbox("mesh"));
    }
    get levelOfDetails() {
        return Gear.lazy(() => levelOfDetailsFlow());
    }
    get programSample() {
        return Gear.lazy(() => programSampleFlow());
    }
    get mouseXBinding() {
        return Gear.lazy(() => mouseXBindingFlow());
    }
    get mouseYBinding() {
        return Gear.lazy(() => mouseYBindingFlow());
    }
    get mouseXY() {
        return Gear.lazy(() => mouseXYFlow());
    }
}
function programFlow() {
    const compileBtn = Gear.ElementEvents.create("compile-button");
    return compileBtn.clickPos.map(pos => program());
}
function program() {
    const vertexShaderElement = document.getElementById("vertex-shader");
    const fragmentShaderElement = document.getElementById("fragment-shader");
    return {
        name: "Program",
        vertexShader: vertexShaderElement.value,
        fragmentShader: fragmentShaderElement.value
    };
}
function levelOfDetailsFlow() {
    const inc = Gear.elementEvents("lod-inc").mouseButons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? +1 : 0);
    const dec = Gear.elementEvents("lod-dec").mouseButons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? -1 : 0);
    return Gear.Flow.from(inc, dec)
        .then(Gear.repeater(128, 0))
        .reduce((i, lod) => clamp(lod + i, 0, 100), 50);
}
function programSampleFlow() {
    return Gear.readableValue("shader-sample")
        .map(value => parseInt(value));
}
function mouseXBindingFlow() {
    return Gear.readableValue("mouse-x")
        .map(value => parseInt(value));
}
function mouseYBindingFlow() {
    return Gear.readableValue("mouse-y")
        .map(value => parseInt(value));
}
function mouseXYFlow() {
    const canvas = Gear.ElementEvents.create("canvas-gl");
    const dragEnabled = canvas.mouseButons.map(([l, m, r]) => l).defaultsTo(false);
    return Gear.Flow.from(canvas.mousePos.then(Gear.flowSwitch(dragEnabled)), canvas.touchPos.map(pos => pos[0])).map(([x, y]) => Gear.pos(2 * x / canvas.element.clientWidth - 1, 1 - 2 * y / canvas.element.clientHeight));
}
function clamp(n, min, max) {
    return n < min ? min : (n > max ? max : n);
}
//# sourceMappingURL=controller.js.map