import { sierpinski } from "./model.js"
import { View } from "./view.js"
import { Controller } from "./controller.js"

export function init() {

    window.onload = e => {
        var view = new View("canvas-gl", "division-depth", "twist", "scale");
        var controller = new Controller("canvas-gl", "input-corners", "input-centers", "input-twist", "input-scale", "division-inc", "division-dec");

        controller.depth.to(view.depth)
        controller.twist.to(view.twist)
        controller.scale.to(view.scale)
        controller.showCorners.to(view.showCorners)
        controller.showCenters.to(view.showCenters)

        sierpinski(controller.depth).to(view.sierpinsky)
    }

}
