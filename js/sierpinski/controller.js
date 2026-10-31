import * as gear from "gear";
import { Linear2DDragging } from "../utils/dragging.js";
export class Controller {
    constructor(view, sierpinski) {
        this.view = view;
        this.sierpinski = sierpinski;
        this.showCorners = true;
        this.showCenters = true;
        this.twistAndScaleDragger = Linear2DDragging.dragger([-6, -2], [6, 2], [6, 2]);
        this._depth = 5;
        this._position = [0, 0];
        this.view.setSierpinski(this.sierpinski.tessellated);
    }
    inputWiring() {
        return {
            keys: {
                centers: { onPressed: () => this.view.setShowCenters(this.showCenters = !this.showCenters) },
                corners: { onPressed: () => this.view.setShowCorners(this.showCorners = !this.showCorners) },
                twist: { onPressed: () => this.twistAndScaleDragger.speed[0] = 6 - this.twistAndScaleDragger.speed[0] },
                scale: { onPressed: () => this.twistAndScaleDragger.speed[1] = 2 - this.twistAndScaleDragger.speed[1] },
                incDepth: { onPressed: () => this.depth += 1 },
                decDepth: { onPressed: () => this.depth -= 1 },
            },
            pointers: {
                canvas: {
                    defaultDraggingTarget: gear.loops.draggingTarget(gear.property(this, "twistAndScale"), this.twistAndScaleDragger)
                }
            }
        };
    }
    outputWiring() {
        return {
            onRender: () => this.view.draw(),
        };
    }
    animate() {
    }
    get depth() {
        return this._depth;
    }
    set depth(depth) {
        this._depth = Math.min(Math.max(depth, 1), 8);
        this.sierpinski.depth = this._depth;
        this.view.setSierpinski(this.sierpinski.tessellated);
    }
    get twistAndScale() {
        return [this.view.twist, this.view.scale];
    }
    set twistAndScale([x, y]) {
        this.view.twist = x;
        this.view.scale = y;
    }
}
Controller.descriptor = {
    input: {
        keys: {
            twist: {
                physicalKeys: [["KeyT"]],
                virtualKeys: "#control-t"
            },
            scale: {
                physicalKeys: [["KeyS"]],
                virtualKeys: "#control-s"
            },
            corners: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-corners"
            },
            centers: {
                physicalKeys: [["ShiftLeft", "KeyC"], ["ShiftRight", "KeyC"]],
                virtualKeys: ".control-centers"
            },
            incDepth: {
                physicalKeys: [["ArrowUp"]],
                virtualKeys: "#control-inc-depth"
            },
            decDepth: {
                physicalKeys: [["ArrowDown"]],
                virtualKeys: "#control-dec-depth"
            },
        },
        pointers: {
            canvas: {
                element: "canvas-gl"
            }
        }
    },
    output: {
        canvases: {
            canvas: {
                element: "canvas-gl"
            }
        },
        fps: {
            element: "fps-watch"
        },
        styling: {
            pressedButton: "pressed"
        },
    }
};
//# sourceMappingURL=controller.js.map