import * as gear from "gear"
import { View } from "./view.js"
import { Controller } from "./controller.js"
import { newSierpinski } from "./model.js";

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/sierpinski"
export const huds = {
    "monitor": "monitor-button"
}

export async function init() {

    window.onload = () => {
        const model = newSierpinski()
        const view = new View(Controller.descriptor.output.canvases.canvas.element, "division-depth", "twist", "scale");
        const controller = new Controller(view, model);
        gear.loops.newLoop(controller, Controller.descriptor).run()
    }

}
