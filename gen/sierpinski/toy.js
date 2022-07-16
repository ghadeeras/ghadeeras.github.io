import { sierpinski } from "./model.js";
import { View } from "./view.js";
import { Controller } from "./controller.js";
export function init() {
    window.onload = () => {
        const controller = new Controller("canvas-gl", "input-corners", "input-centers", "input-twist", "input-scale", "division-inc", "division-dec");
        new View("canvas-gl", "division-depth", "twist", "scale", {
            depth: controller.depth,
            scale: controller.scale,
            twist: controller.twist,
            showCorners: controller.showCorners,
            showCenters: controller.showCenters,
            sierpinsky: sierpinski(controller.depth)
        });
    };
}
//# sourceMappingURL=toy.js.map