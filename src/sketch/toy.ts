import { gpu } from "lumen"
import * as gear from "gear"
import * as aether from "aether"
import { LinearDragging } from "../utils/dragging.js"

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
                brushSize: {
                    physicalKeys: [["KeyB"]],
                    virtualKeys: "#control-b"
                },
                clear: {
                    physicalKeys: [["KeyC"]],
                    virtualKeys: "#control-c"
                },
                undo: {
                    physicalKeys: [["KeyU"]],
                    virtualKeys: "#control-u"
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

    private strokes: Stroke[] = []
    private pointerPosition: aether.Vec2 = [0, 0]
    
    private _brushSize = 4;

    private strokeTarget = gear.loops.draggingTarget(
        { getter: () => this.stroke, setter: () => {} }, 
        new StrokeSampler()
    )
    private brushSizeTarget = gear.loops.draggingTarget(
        gear.property(this, "brushSize"), 
        new LinearDragging(() => this.brushSize, 1, 40, 20)
    )

    constructor(private canvas: HTMLCanvasElement) {
        this.brushSize = this._brushSize
    }

    static async create(): Promise<Toy> {
        try {
            const device = await gpuDevice()
        } catch (e) {
            console.warn("WebGPU not supported, falling back to CPU rendering")
        }
        const canvas = document.getElementById(Toy.descriptor.output.canvases.scene.element) as HTMLCanvasElement
        return new Toy(canvas)
    }

    get stroke(): Stroke {
        return this.strokes.length == 0 || this.strokes[this.strokes.length - 1].finalized 
            ? this.newStroke() 
            : this.strokes[this.strokes.length - 1]
    }

    get brushSize() {
        return this._brushSize
    }

    set brushSize(size: number) {
        this._brushSize = Math.round(size)
        const cursor = gear.required(document.getElementById("cursor"))
        const circle = gear.required(cursor.getElementsByTagName("circle")[0]) as SVGCircleElement
        circle.setAttribute("r", `${this._brushSize / window.devicePixelRatio}`)
        circle.setAttribute("stroke-width", `${this._brushSize / window.devicePixelRatio}`)
    }

    private newStroke(): Stroke {
        const stroke = new Stroke(this._brushSize, () => [this.canvas.width, this.canvas.height])
        this.strokes.push(stroke)
        return stroke
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>, outputs: gear.loops.LoopOutputs<ToyDescriptor>): gear.loops.LoopInputWiring<ToyDescriptor> {
        const v = 0.01
        return {
            keys: {
                paint: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
                clear: { onPressed: () => this.strokes = [] },
                undo: { onPressed: () => this.strokes.pop() },
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() },
            },
            pointers: {
                primary: {
                    defaultDraggingTarget: this.strokeTarget,
                    onMoved: () => {
                        this.pointerPosition = canvasSpacePos(inputs.pointers.primary.position, [this.canvas.width, this.canvas.height])
                        const cursor = gear.required(document.getElementById("cursor"))
                        cursor.style.left = `${this.pointerPosition[0] / window.devicePixelRatio - 64}px`
                        cursor.style.top = `${this.pointerPosition[1] / window.devicePixelRatio - 64}px`
                        cursor.style.display = "block"
                    }
                }
            }
        }
    }

    outputWiring(): gear.loops.LoopOutputWiring<ToyDescriptor> {
        return {
            canvases: {
                scene: {
                    onResize: () => {}
                }
            },
            onRender: () => this.render()
        }
    }
    
    animate(): void {
    }

    render() {
        const ctx = gear.required(this.canvas.getContext("2d"))
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.strokeStyle = "black"
        for (const stroke of this.strokes) {
            ctx.lineWidth = stroke.brushSize
            if (stroke.points.length == 0) {
                continue
            }
            ctx.beginPath()
            ctx.moveTo(stroke.points[0].position[0], stroke.points[0].position[1])
            if (stroke.points.length == 1) {
                ctx.ellipse(stroke.points[0].position[0], stroke.points[0].position[1], 2, 2, 0, 0, 2 * Math.PI)
                ctx.stroke()
                continue
            }
            for (const point of stroke.points.slice(1)) {
                ctx.lineTo(point.position[0], point.position[1])
            }
            ctx.stroke()
        }
    }

}

type StrokePoint = {
    position: aether.Vec2
    time: number
    distance: number
}

class Stroke {

    readonly points: StrokePoint[] = []

    private _startTime = performance.now()
    private _endTime = this._startTime
    private _length = 0
    private _finalized = false

    constructor(readonly brushSize: number, private canvasSize: () => aether.Vec2) {
    }

    get duration() {
        return this._endTime - this._startTime
    }

    get length() {
        return this._length
    }

    get finalized() {
        return this._finalized || this.points.length == 0
    }

    finalize() {
        this._finalized = true
    }

    addPoint(position: aether.Vec2) {
        const canvasSize = this.canvasSize()
        const p = canvasSpacePos(position, canvasSize)
        if (this._finalized) {
            throw new Error("Cannot add point to a finalized stroke")
        }
        this._endTime = performance.now()
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1]
            const deltaTime = this._endTime - lastPoint.time
            const beforeLastPoint = this.points.length > 1 ? this.points[this.points.length - 2] : lastPoint
            const lastDistance = aether.vec2.length(aether.vec2.sub(lastPoint.position, beforeLastPoint.position))
            const prevPoint = lastDistance < this.brushSize && deltaTime < 500 ? beforeLastPoint : lastPoint
            if (prevPoint !== lastPoint) {
                this.points.pop()
                this._length -= lastDistance
            }
            const distance = aether.vec2.length(aether.vec2.sub(p, prevPoint.position))
            this._length += distance
        }
        this.points.push({ position: p, time: performance.now(), distance: this._length })
    }

}

class StrokeSampler implements gear.loops.Dragger<Stroke>{

    begin(stroke: Stroke, position: gear.loops.PointerPosition): gear.loops.DraggingFunction<Stroke> {
        stroke.addPoint(position)
        return position => {
            stroke.addPoint(position)
            return stroke
        }
    }

    end(stroke: Stroke): Stroke {
        stroke.finalize()
        return stroke
    }

}

function canvasSpacePos(position: [number, number], canvasSize: [number, number]) {
    return aether.vec2.mul(aether.vec2.mul(aether.vec2.add(position, [1, -1]), [0.5, -0.5]), canvasSize)
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
