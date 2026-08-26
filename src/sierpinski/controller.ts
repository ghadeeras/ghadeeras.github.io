import * as gear from "gear"
import { View } from "./view.js";
import { positionDragging } from "../utils/dragging.js";
import { Sierpinski } from "./model.js";

type Descriptor = typeof Controller.descriptor;

export class Controller implements gear.loops.LoopLogic<Descriptor> {

    static descriptor = {
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
    } satisfies gear.loops.LoopDescriptor

    private twistEnabled: boolean = true
    private scaleEnabled: boolean = true
    private showCorners: boolean = true
    private showCenters: boolean = true
    
    constructor(private view: View, private sierpinski: Sierpinski) {
        this.view.setSierpinski(this.sierpinski.tessellated)
    }

    inputWiring(): gear.loops.LoopInputWiring<Descriptor> {
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
        }
    }

    outputWiring(): gear.loops.LoopOutputWiring<Descriptor> {
        return {
            onRender: () => this.view.draw(),
        }
    }

    animate(): void {
    }

    private _depth = 5

    get depth(): number {
        return this._depth
    }

    set depth(depth: number) {
        this._depth = Math.min(Math.max(depth, 1), 8) 
        this.sierpinski.depth = this._depth
        this.view.setSierpinski(this.sierpinski.tessellated)
    }

    private _position: [number, number] = [0, 0]

    get position(): [number, number] {
        return this._position
    }

    set position([x, y]: [number, number]) {
        if (this.twistEnabled) {
            this._position[0] = x
            this.view.setTwist(2 * Math.PI * x)
        }
        if (this.scaleEnabled) {
            this._position[1] = y
            this.view.setScale(2 * Math.PI * y)
        }
    }

}
