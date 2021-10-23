import { sierpinski } from "./model.js"
import { View } from "./view.js"
import { Controller } from "./controller.js"

export function init() {

    window.onload = () => {
        var controller = new Controller("canvas-gl", "input-corners", "input-centers", "input-twist", "input-scale", "division-inc", "division-dec");
        var view = new View("canvas-gl", "division-depth", "twist", "scale", {
            depth: controller.depth,
            scale: controller.scale,
            twist: controller.twist,
            showCorners: controller.showCorners,
            showCenters: controller.showCenters,
            sierpinsky: sierpinski(controller.depth)
        });
    }

}
