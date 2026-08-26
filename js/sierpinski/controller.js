import * as gear from "gear";
import { positionDragging } from "../utils/dragging.js";
export class Controller {
    constructor(view, sierpinski) {
        this.view = view;
        this.sierpinski = sierpinski;
        this.twistEnabled = true;
        this.scaleEnabled = true;
        this.showCorners = true;
        this.showCenters = true;
        this._depth = 5;
        this._position = [0, 0];
        this.view.setSierpinski(this.sierpinski.tessellated);
    }
    inputWiring() {
        return {
            keys: {
                centers: { onPressed: () => this.view.setShowCenters(this.showCenters = !this.showCenters) },
                corners: { onPressed: () => this.view.setShowCorners(this.showCorners = !this.showCorners) },
                twist: { onPressed: () => this.twistEnabled = !this.twistEnabled },
                scale: { onPressed: () => this.scaleEnabled = !this.scaleEnabled },
                incDepth: { onPressed: () => this.depth += 1 },
                decDepth: { onPressed: () => this.depth -= 1 },
            },
            pointers: {
                canvas: {
                    defaultDraggingTarget: gear.loops.draggingTarget(gear.property(this, "position"), positionDragging)
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
    get position() {
        return this._position;
    }
    set position([x, y]) {
        if (this.twistEnabled) {
            this._position[0] = x;
            this.view.setTwist(2 * Math.PI * x);
        }
        if (this.scaleEnabled) {
            this._position[1] = y;
            this.view.setScale(2 * Math.PI * y);
        }
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