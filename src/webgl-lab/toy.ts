import { Controller } from "./controller.js";
import { loadShaders, samples } from "./samples.js";
import { View } from "./view.js";

export function init() {
    window.onload = () => doInit();
}

function doInit() {
    const controller = new Controller();
    const view = new View("canvas-gl", samples, {
        levelOfDetails: controller.levelOfDetails(),
        programSample: controller.programSample()
            .map(index => samples[index])
            .then(loadShaders),
        program: controller.program(),
        mesh: controller.mesh(),
        mouseXBinding: controller.mouseXBinding(),
        mouseYBinding: controller.mouseYBinding(),
        mouseXY: controller.mouseXY()
    });
}
