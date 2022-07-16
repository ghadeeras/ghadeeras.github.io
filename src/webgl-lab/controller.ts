import { gear } from "/gen/libs.js"
import { positionDragging } from "../utils/dragging.js";
import { ProgramSample } from "./samples.js";

export class Controller {

    get program() {
        return gear.lazy(() => programFlow());
    }

    get mesh() {
        return gear.lazy(() => gear.checkbox("mesh"));
    }

    get levelOfDetails() {
        return gear.lazy(() => levelOfDetailsFlow());
    }

    get programSample() {
        return gear.lazy(() => programSampleFlow());
    }

    get mouseXBinding() {
        return gear.lazy(() => mouseXBindingFlow());
    }

    get mouseYBinding() {
        return gear.lazy(() => mouseYBindingFlow());
    }

    get mouseXY() {
        return gear.lazy(() => mouseXYFlow());
    }

}

function programFlow() {
    const compileBtn = gear.ElementEvents.create("compile-button")
    return compileBtn.clickPos.value
        .map(program)
        .filter(program => program && program.vertexShader && program.fragmentShader ? true : false);
}

function program(): ProgramSample {
    const vertexShaderElement = document.getElementById("vertex-shader") as HTMLTextAreaElement;
    const fragmentShaderElement = document.getElementById("fragment-shader") as HTMLTextAreaElement;
    return {
        name: "Program",
        vertexShader: vertexShaderElement.value,
        fragmentShader: fragmentShaderElement.value
    }
}

function levelOfDetailsFlow() {
    const inc = gear.elementEvents("lod-inc").pointerButtons.value.map(([l, ..._]) => l ? +1 : 0)
    const dec = gear.elementEvents("lod-dec").pointerButtons.value.map(([l, ..._]) => l ? -1 : 0)
    return gear.Value.from(inc, dec)
        .then(gear.repeater(128, 0))
        .reduce((i, lod) => clamp(lod + i, 0, 100), 50)
}

function programSampleFlow() {
    return gear.readableValue("shader-sample")
        .map(value => parseInt(value))
}

function mouseXBindingFlow() {
    return gear.readableValue("mouse-x")
        .map(value => parseInt(value))
}

function mouseYBindingFlow() {
    return gear.readableValue("mouse-y")
        .map(value => parseInt(value))
}

function mouseXYFlow() {
    const canvas = gear.ElementEvents.create("canvas-gl");
    return canvas.dragging.value.then(gear.drag(positionDragging))
}

function clamp(n: number, min: number, max: number) {
    return n < min ? min : (n > max ? max : n);
}
