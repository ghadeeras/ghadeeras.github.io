import * as gear from "gear"
import { View } from "./view.js";
import { Linear2DDragging } from "../utils/dragging.js";
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

    private showCorners: boolean = true
    private showCenters: boolean = true
    private twistAndScaleDragger = Linear2DDragging.dragger([-6, -2], [6, 2], [6, 2])
    
    constructor(private view: View, private sierpinski: Sierpinski) {
        this.view.setSierpinski(this.sierpinski.tessellated)
    }

    inputWiring(): gear.loops.LoopInputWiring<Descriptor> {
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

    get twistAndScale(): [number, number] {
        return [this.view.twist, this.view.scale]
    }

    set twistAndScale([x, y]: [number, number]) {
        this.view.twist = x 
        this.view.scale = y 
    }

}
