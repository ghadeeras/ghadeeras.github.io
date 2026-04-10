import { gpu } from "lumen"
import * as gear from "gear"
import * as aether from "aether"
import { LinearDragging, positionDragging, TranslationDragging } from "../utils/dragging.js"
import { Renderer, ViewBindGroup } from "./stroke.renderer.js"
import { TessellatedStrokeFactory } from "./stroke.computer.js"
import { Stroke } from "./stroke.js"
import { Brush } from "./brush.js"
import { Color, Pallette2D } from "./color.js"

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
                drawing: {
                    physicalKeys: [["KeyD"]],
                    virtualKeys: "#control-d"
                },
                hue: {
                    physicalKeys: [["KeyH"]],
                    virtualKeys: "#control-h"
                },
                intensity: {
                    physicalKeys: [["KeyI"]],
                    virtualKeys: "#control-i"
                },
                backgroundHue: {
                    physicalKeys: [["ShiftRight", "KeyH"], ["ShiftLeft", "KeyH"]],
                    virtualKeys: ".control-bg-h"
                },
                backgroundIntensity: {
                    physicalKeys: [["ShiftRight", "KeyI"], ["ShiftLeft", "KeyI"]],
                    virtualKeys: ".control-bg-i"
                },
                brushSize: {
                    physicalKeys: [["KeyB"]],
                    virtualKeys: "#control-b"
                },
                tension: {
                    physicalKeys: [["KeyT"]],
                    virtualKeys: "#control-t"
                },
                sliding: {
                    physicalKeys: [["KeyS"]],
                    virtualKeys: "#control-s"
                },
                clear: {
                    physicalKeys: [["ShiftRight", "Delete"], ["ShiftLeft", "Delete"]],
                    virtualKeys: ".control-clear"
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
    private brush = new Brush(this.canvas.device)
    private backgroundColor = new Color([1, 1, 1, 1])
    private currentColor: "BRUSH" | "BACKGROUND" = "BRUSH"
    private pallette2D = new Pallette2D([-1, -1], [0, 1], [1, -1])
    
    private inverseViewMatrix = aether.mat3.identity()
    private viewMatrix = aether.mat3.identity()

    private hue = this.toHue2D(this.brush.color.hue)

    private strokeTarget = gear.loops.draggingTarget(
        gear.property(this, "stroke"),
        new StrokeSampler(p => this.infiniteCanvasSpacePos(p))
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
        gear.property(this, "intensity"), 
        new LinearDragging(() => 0, 0, 1, 1)
    )
    private slidingTarget = gear.loops.draggingTarget(
        gear.property(this, "matrix"), 
        TranslationDragging.dragger(() => {
            return aether.mat4.scaling(-2 / this.canvas.element.width, 2 / this.canvas.element.height, 1)
        }, 1)
    )

    constructor(private canvas: gpu.Canvas, private renderer: Renderer, private tessellatedStrokeFactory: TessellatedStrokeFactory) {
        this.viewGroup = renderer.view({
            matrix: this.viewMatrix,
            width: canvas.element.width,
            height: canvas.element.height
        })
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

    private infiniteCanvasSpacePos(position: [number, number]): aether.Vec2 {
        return aether.vec2.from(aether.mat3.apply(this.inverseViewMatrix, [...this.canvasSpacePos(position), 1]))
    }

    private canvasSpacePos(position: [number, number]): aether.Vec2 {
        return aether.vec2.mul(
            aether.vec2.mul(
                aether.vec2.add(position, [1, -1]), 
                [0.5, -0.5]
            ), 
            [this.canvas.element.width, this.canvas.element.height]
        )
    }

    get matrix() {
        let m = this.inverseViewMatrix
        return [
            [...m[0], 0],
            [...m[1], 0],
            [0, 0, 1, 0],
            [...m[2], 1],
        ]
    }

    set matrix(matrix: aether.Mat4) {
        const m = matrix
            .filter((_, i) => i != 2)
            .map(r => r.slice(0, 3))
            .flatMap(r => r)
        this.inverseViewMatrix = aether.mat3.from(m)
        this.viewMatrix = aether.mat3.inverse(this.inverseViewMatrix)
        this.renderer.updateView(this.viewGroup, {
            matrix: this.viewMatrix,
            width: this.canvas.element.width,
            height: this.canvas.element.height
        })
    }

    get color() {
        return this.currentColor === "BRUSH" ? this.brush.color : this.backgroundColor
    }

    get hue2D() {
        return this.hue
    }

    set hue2D(hue2D: aether.Vec2) {
        this.hue = hue2D
        const p = aether.vec2.scale(aether.vec2.mul(hue2D, [this.canvas.element.width, this.canvas.element.height]), 1 / Math.min(this.canvas.element.width, this.canvas.element.height))
        this.color.hue = this.pallette2D.toColor(p)
    }

    get intensity() {
        return this.color.intensity
    }

    set intensity(intensity: number) {
        this.color.intensity = intensity
    }

    private toHue2D(hue: aether.Vec3): aether.Vec2 {
        const p = this.pallette2D.fromColor(hue)
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
                drawing: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
                tension: { onPressed: () => inputs.pointers.primary.draggingTarget = this.tensionTarget },
                hue: { onPressed: () => { this.currentColor = "BRUSH"; inputs.pointers.primary.draggingTarget = this.hueTarget } },
                intensity: { onPressed: () => { this.currentColor = "BRUSH"; inputs.pointers.primary.draggingTarget = this.intensityTarget } },
                backgroundHue: { onPressed: () => { this.currentColor = "BACKGROUND"; inputs.pointers.primary.draggingTarget = this.hueTarget } },
                backgroundIntensity: { onPressed: () => { this.currentColor = "BACKGROUND"; inputs.pointers.primary.draggingTarget = this.intensityTarget } },
                sliding: { onPressed: () => inputs.pointers.primary.draggingTarget = this.slidingTarget },
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
                        this.renderer.updateView(this.viewGroup, {
                            matrix: this.viewMatrix,
                            width: this.canvas.element.width,
                            height: this.canvas.element.height
                        })
                    }
                }
            },
            onRender: () => this.render()
        }
    }
    
    animate(): void {
    }

    render() {
        const c = this.backgroundColor.rgba
        this.renderer.renderTo(
            this.canvas.attachment({ r: c[0], g: c[1], b: c[2], a: c[3] }), 
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
