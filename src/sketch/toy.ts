import { gpu } from "lumen"
import * as gear from "gear"
import * as aether from "aether"
import { LinearDragging, positionDragging } from "../utils/dragging.js"
import { Renderer, ViewBindGroup } from "./stroke.renderer.js"
import { TessellatedStrokeFactory } from "./stroke.computer.js"
import { Stroke } from "./stroke.js"
import { Brush } from "./brush.js"

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/sketch"
export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const toy = await Toy.create()
    const loop = gear.loops.newLoop(toy, Toy.descriptor)
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements gear.loops.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        input: {
            keys: {
                paint: {
                    physicalKeys: [["KeyP"]],
                    virtualKeys: "#control-p"
                },
                hue: {
                    physicalKeys: [["KeyH"]],
                    virtualKeys: "#control-h"
                },
                intensity: {
                    physicalKeys: [["KeyI"]],
                    virtualKeys: "#control-i"
                },
                brushSize: {
                    physicalKeys: [["KeyB"]],
                    virtualKeys: "#control-b"
                },
                tension: {
                    physicalKeys: [["KeyT"]],
                    virtualKeys: "#control-t"
                },
                clear: {
                    physicalKeys: [["ShiftRight", "Delete"], ["ShiftLeft", "Delete"]],
                    virtualKeys: "#control-clear"
                },
                undo: {
                    physicalKeys: [["Backspace"]],
                    virtualKeys: "#control-undo"
                },
                record: {
                    physicalKeys: [["KeyV"]],
                    virtualKeys: "#control-v"
                },
            },
            pointers: {
                primary: {
                    element: "canvas"
                }
            }
        },
        output: {
            canvases: {
                scene: {
                    element: "canvas"
                }
            },
            fps: {
                element: "freq-watch"
            },
            styling: {
                pressedButton: "pressed"
            },
        },
    } satisfies gear.loops.LoopDescriptor

    private viewGroup: ViewBindGroup
    private strokes: Stroke[] = []
    private brush = new Brush(this.canvas.device);

    private brushHue = this.toHue2D(this.brush.hue)

    private strokeTarget = gear.loops.draggingTarget(
        gear.property(this, "stroke"),
        new StrokeSampler(p => this.canvasSpacePos(p))
    )
    private brushSizeTarget = gear.loops.draggingTarget(
        gear.property(this.brush, "thickness"), 
        new LinearDragging(() => 0, 8, 40, 20)
    )
    private tensionTarget = gear.loops.draggingTarget(
        gear.property(this, "tension"), 
        new LinearDragging(() => 0, 2, 128, 64)
    )
    private hueTarget = gear.loops.draggingTarget(
        gear.property(this, "hue2D"),
        positionDragging
    )
    private intensityTarget = gear.loops.draggingTarget(
        gear.property(this.brush, "intensity"), 
        new LinearDragging(() => 0, 0, 1, 1)
    )

    constructor(private canvas: gpu.Canvas, private renderer: Renderer, private tessellatedStrokeFactory: TessellatedStrokeFactory) {
        this.viewGroup = renderer.view(canvas.element)
    }

    static async create(): Promise<Toy> {
        try {
            const device = await gpuDevice()
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element, 4)
            const renderer = await Renderer.create(device)
            const tessellatedStrokeFactory = await TessellatedStrokeFactory.create(device)
            return new Toy(canvas, renderer, tessellatedStrokeFactory)
        } catch (e) {
            gear.required(document.getElementById(Toy.descriptor.output.canvases.scene.element)).style.cursor = "default"
            throw e
        }
    }

    private canvasSpacePos(position: [number, number]) {
        return aether.vec2.mul(
            aether.vec2.mul(
                aether.vec2.add(position, [1, -1]), 
                [0.5, -0.5]
            ), 
            [this.canvas.element.width, this.canvas.element.height]
        )
    }

    get hue2D() {
        return this.brushHue
    }

    set hue2D(hue2D: aether.Vec2) {
        this.brushHue = hue2D
        const p = aether.vec2.scale(aether.vec2.mul(hue2D, [this.canvas.element.width, this.canvas.element.height]), 1 / Math.min(this.canvas.element.width, this.canvas.element.height))
        this.brush.hue = toBarycentricCoordinates(p)
    }

    private toHue2D(hue: aether.Vec3): aether.Vec2 {
        const p = fromBarycentricCoordinates(hue)
        return aether.vec2.scale(aether.vec2.mul(p, [this.canvas.element.height, this.canvas.element.width]), 1 / Math.max(this.canvas.element.width, this.canvas.element.height))
    }

    get tension() {
        return this.tessellatedStrokeFactory.strokeTension
    }

    set tension(tension: number) {
        this.brush.tension = tension
        for (const s of this.strokes) {
            s.tension = tension
        }
    }

    get stroke(): Stroke {
        const lastIndex = this.strokes.length - 1
        return lastIndex < 0 || this.strokes[lastIndex].finalized 
            ? new Stroke(this.brush.attributes, attributes => this.brush.destroyDataBuffer(attributes))
            : this.strokes[lastIndex]
    }

    set stroke(stroke: Stroke) {
        const lastIndex = this.strokes.length - 1
        if (lastIndex < 0 || this.strokes[lastIndex] !== stroke) {
            this.strokes.push(stroke)
        }
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>, outputs: gear.loops.LoopOutputs<ToyDescriptor>): gear.loops.LoopInputWiring<ToyDescriptor> {
        const v = 0.01
        return {
            keys: {
                paint: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
                tension: { onPressed: () => inputs.pointers.primary.draggingTarget = this.tensionTarget },
                hue: { onPressed: () => inputs.pointers.primary.draggingTarget = this.hueTarget },
                intensity: { onPressed: () => inputs.pointers.primary.draggingTarget = this.intensityTarget },
                clear: { onPressed: () => this.clearStrokes() },
                undo: { onPressed: () => this.undo() },
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() },
            },
            pointers: {
                primary: {
                    defaultDraggingTarget: this.strokeTarget,
                    onMoved: () => this.brush.position = this.canvasSpacePos(inputs.pointers.primary.position)
                }
            }
        }
    }

    private undo(): void {
        this.strokes.pop()?.destroy()
    }

    private clearStrokes(): void {
        this.strokes.forEach(s => s.destroy())
        this.strokes = []
    }

    outputWiring(): gear.loops.LoopOutputWiring<ToyDescriptor> {
        return {
            canvases: {
                scene: {
                    onResize: () => {
                        this.canvas.resize()
                        this.renderer.resize(this.viewGroup, this.canvas.element)
                    }
                }
            },
            onRender: () => this.render()
        }
    }
    
    animate(): void {
    }

    render() {
        this.renderer.renderTo(
            this.canvas.attachment({ r: 1, g: 1, b: 1, a: 1 }), 
            this.strokes.map(s => {
                this.tessellatedStrokeFactory.strokeThickness = s.thickness
                this.tessellatedStrokeFactory.strokeTension = s.tension
                return s.strokeGroup(points => this.renderer.stroke(
                    this.brush.dataBuffer(s.attributes),
                    this.tessellatedStrokeFactory.tesselate(points)
                ))
            }), 
            this.viewGroup
        )
    }

}

class StrokeSampler implements gear.loops.Dragger<Stroke> {

    constructor(private canvasSpacePos: (p: aether.Vec2) => aether.Vec2) {
    }

    begin(stroke: Stroke): gear.loops.DraggingFunction<Stroke> {
        return position => {
            stroke.addPoint(this.canvasSpacePos(position))
            return stroke
        }
    }

    end(stroke: Stroke): Stroke {
        stroke.finalize()
        return stroke
    }

}

async function gpuDevice() {
    const gpuStatus = gear.required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}

const c30 = Math.cos(Math.PI / 6)
const s30 = Math.sin(Math.PI / 6)
const redLine = aether.vec3.of(-c30, -s30, s30)
const greenLine = aether.vec3.of(0, 1, s30)
const blueLine = aether.vec3.of(c30, -s30, s30)

function toBarycentricCoordinates(position: aether.Vec2): aether.Vec3 {
    const p = aether.vec3.of(...position, 1)
    return aether.vec3.min(aether.vec3.max(aether.vec3.scale(aether.vec3.of(
        aether.vec3.dot(p, redLine),
        aether.vec3.dot(p, greenLine),
        aether.vec3.dot(p, blueLine)
    ), 1 / (1 + s30)), [0, 0, 0]), [1, 1, 1])
}

function fromBarycentricCoordinates(hue: aether.Vec3): aether.Vec2 {
    const h = aether.vec3.sub(aether.vec3.scale(hue, 1 + s30), [s30, s30, s30])
    const r = aether.vec2.scale(aether.vec2.from(redLine), h[0])
    const g = aether.vec2.scale(aether.vec2.from(greenLine), h[1])
    const b = aether.vec2.scale(aether.vec2.from(blueLine), h[2])
    return aether.vec2.addAll(r, g, b)
}