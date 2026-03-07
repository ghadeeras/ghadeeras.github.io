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

    private context: CanvasRenderingContext2D
    private strokes: Stroke[] = []
    private brush = new Brush();

    private strokeTarget = gear.loops.draggingTarget(
        gear.property(this, "stroke"),
        new StrokeSampler(p => this.canvasSpacePos(p))
    )
    private brushSizeTarget = gear.loops.draggingTarget(
        gear.property(this.brush, "size"), 
        new LinearDragging(() => 0, 1, 40, 20)
    )

    constructor(private canvas: HTMLCanvasElement) {
        this.context = gear.required(this.canvas.getContext("2d"))
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

    private canvasSpacePos(position: [number, number]) {
        return aether.vec2.mul(aether.vec2.mul(aether.vec2.add(position, [1, -1]), [0.5, -0.5]), [this.canvas.width, this.canvas.height])
    }

    get stroke(): Stroke {
        const lastIndex = this.strokes.length - 1
        return lastIndex < 0 || this.strokes[lastIndex].finalized 
            ? new Stroke(this.brush.size)
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
                clear: { onPressed: () => this.strokes = [] },
                undo: { onPressed: () => this.strokes.pop() },
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
        const ctx = this.context
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        ctx.lineJoin = "round"
        ctx.lineCap = "round"
        ctx.strokeStyle = "black"
        for (const stroke of this.strokes) {
            ctx.lineWidth = stroke.brushSize
            ctx.beginPath()
            const pos0 = stroke.points[0].position
            if (stroke.points.length == 1) {
                ctx.ellipse(pos0[0], pos0[1], 2, 2, 0, 0, 2 * Math.PI)
            } else {
                ctx.moveTo(pos0[0], pos0[1])
                for (let i = 1; i < stroke.points.length; i++) {
                    const pos = stroke.points[i].position
                    ctx.lineTo(pos[0], pos[1])
                }
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

    constructor(readonly brushSize: number) {
    }

    get duration() {
        return this._endTime - this._startTime
    }

    get length() {
        return this._length
    }

    get finalized() {
        return this._finalized
    }

    finalize() {
        this._finalized = true
    }

    addPoint(position: aether.Vec2) {
        if (this._finalized) {
            throw new Error("Cannot add point to a finalized stroke")
        }
        this._endTime = performance.now()
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1]
            const beforeLastPoint = this.points.length > 1 ? this.points[this.points.length - 2] : lastPoint
            const lastDistance = aether.vec2.length(aether.vec2.sub(lastPoint.position, beforeLastPoint.position))
            const lastDeltaTime = lastPoint.time - beforeLastPoint.time
            const prevPoint = lastDistance < this.brushSize / (1 + 0.01 * lastDeltaTime) ? beforeLastPoint : lastPoint
            if (prevPoint !== lastPoint) {
                this.points.pop()
                this._length -= lastDistance
            }
            const distance = aether.vec2.length(aether.vec2.sub(position, prevPoint.position))
            this._length += distance
        }
        this.points.push({ position: position, time: this._endTime, distance: this._length })
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

class Brush {

    private cursor = gear.required(document.getElementById("cursor")) as HTMLElement
    private circle = gear.required(this.cursor.getElementsByTagName("circle")[0]) as SVGCircleElement

    private _size: number = 4
    private _position: aether.Vec2 = [0, 0]

    constructor() {
        this.size = this._size
    }

    get size() {
        return this._size
    }

    set size(size: number) {
        this._size = size
        const radius = this._size / window.devicePixelRatio
        this.circle.setAttribute("r", `${radius}`)
        this.circle.setAttribute("stroke-width", `${radius}`)
    }

    get position() {
        return this._position
    }

    set position(pos: aether.Vec2) {
        this._position = pos
        this.cursor.style.left = `${this._position[0] / window.devicePixelRatio - this.cursor.clientWidth / 2}px`
        this.cursor.style.top = `${this._position[1] / window.devicePixelRatio - this.cursor.clientHeight / 2}px`
        this.cursor.style.display = "block"
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
