import { gpu } from "lumen"
import * as gear from "gear"
import * as aether from "aether"
import { LinearDragging, positionDragging, TranslationDragging } from "../utils/dragging.js"
import { Renderer } from "./stroke.renderer.js"
import { TessellatedStrokeFactory } from "./stroke.computer.js"
import { Stroke } from "./stroke.js"
import { Brush } from "./brush.js"
import { Color, fromHex, Pallette2D, toHex } from "./color.js"
import { BackgroundGroup, BackgroundRenderer } from "./bg.renderer.js"
import * as cmn from "./common.js"

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

const windingSpeed = 2048

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
                toggleClosed: {
                    physicalKeys: [["KeyC"]],
                    virtualKeys: "#control-closed"
                },
                toggleLines: {
                    physicalKeys: [["KeyL"]],
                    virtualKeys: "#control-lines"
                },
                loadBackgroundImage: {
                    physicalKeys: [["KeyG"]],
                    virtualKeys: "#control-load-bg"
                },
                clearBackgroundImage: {
                    physicalKeys: [["Delete", "KeyG"]],
                    virtualKeys: ".control-clear-bg"
                },
                resetViewMatrix: {
                    physicalKeys: [["Delete", "KeyS"]],
                    virtualKeys: ".control-reset-view"
                },
                break: {
                    physicalKeys: [["Enter"]],
                    virtualKeys: "#control-break"
                },
                windBackward: {
                    physicalKeys: [["ArrowLeft"]],
                    virtualKeys: "#control-wind-backward"
                },
                windForward: {
                    physicalKeys: [["ArrowRight"]],
                    virtualKeys: "#control-wind-forward"
                },
                windBeginning: {
                    physicalKeys: [["Home"]],
                    virtualKeys: "#control-wind-beginning"
                },
                windEnd: {
                    physicalKeys: [["End"]],
                    virtualKeys: "#control-wind-end"
                },
                windFast: {
                    physicalKeys: [["ShiftRight"], ["ShiftLeft"]],
                    virtualKeys: "#control-wind-fast"
                },
                save: {
                    physicalKeys: [["ControlLeft", "KeyS"], ["ControlRight", "KeyS"]],
                    virtualKeys: ".control-save"
                },
                load: {
                    physicalKeys: [["ControlLeft", "KeyL"], ["ControlRight", "KeyL"]],
                    virtualKeys: ".control-load"
                },
                record: {
                    physicalKeys: [["KeyV"]],
                    virtualKeys: "#control-v"
                },
                resizeCanvas: {
                    physicalKeys: [["KeyR"]],
                    virtualKeys: "#control-resize-canvas"
                }
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

    private viewGroup: cmn.ViewBindGroup
    private backgroundGroup: BackgroundGroup | null = null
    private strokes: Stroke[] = []
    private distance: Distance = { strokeIndex: 0, distance: 0 }
    private targetStroke = -1
    private fastWind = false
    private brush = new Brush(this.canvas.device, this.canvas.element)
    private lines = false
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

    private imageFileSelector = gear.FileSelector.create().disallowMultipleFiles().ofType("image/*")
    private jsonFileSelector = gear.FileSelector.create().disallowMultipleFiles().ofType("application/json")

    constructor(private canvas: gpu.Canvas, private renderer: Renderer, private tessellatedStrokeFactory: TessellatedStrokeFactory, private backgroundRenderer: BackgroundRenderer) {
        this.viewGroup = renderer.view(this.view)
    }

    static async create(): Promise<Toy> {
        try {
            const device = await gpuDevice()
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element, 4)
            const commonLayouts = cmn.groupLayouts(device)
            const renderer = await Renderer.create(commonLayouts)
            const tessellatedStrokeFactory = await TessellatedStrokeFactory.create(device)
            const backgroundRenderer = await BackgroundRenderer.create(commonLayouts.view)
            return new Toy(canvas, renderer, tessellatedStrokeFactory, backgroundRenderer)
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
            .map(r => [r[0], r[1], r[3]])
            .flatMap(r => r)
        this.inverseViewMatrix = aether.mat3.from(m)
        this.viewMatrix = aether.mat3.inverse(this.inverseViewMatrix)
        this.renderer.updateView(this.viewGroup, this.view)
    }

    get visibleDistance() {
        return this.distance
    }

    set visibleDistance(visibleDistance: Distance) {
        this.distance = visibleDistance
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
            ? new Stroke(this.brush.attributes, attributes => this.brush.destroyDataBuffer(attributes), false, this.lines ? Number.POSITIVE_INFINITY : 4)
            : this.strokes[lastIndex]
    }

    set stroke(stroke: Stroke) {
        const lastIndex = this.strokes.length - 1
        if (lastIndex < 0 || this.strokes[lastIndex] !== stroke) {
            this.strokes.push(stroke)
            this.resetDistance()
        }
    }

    get view(): cmn.View {
        return {
            matrix: this.viewMatrix,
            inverse_matrix: this.inverseViewMatrix,
            width: this.canvas.element.width,
            height: this.canvas.element.height
        }
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>, outputs: gear.loops.LoopOutputs<ToyDescriptor>): gear.loops.LoopInputWiring<ToyDescriptor> {
        return {
            keys: {
                drawing: { onPressed: () => inputs.pointers.primary.draggingTarget = this.strokeTarget },
                brushSize: { onPressed: () => inputs.pointers.primary.draggingTarget = this.brushSizeTarget },
                tension: { onPressed: () => inputs.pointers.primary.draggingTarget = this.tensionTarget },
                hue: { onPressed: () => { this.setColorDraggingTarget(inputs, "BRUSH", this.hueTarget) } },
                intensity: { onPressed: () => { this.setColorDraggingTarget(inputs, "BRUSH", this.intensityTarget) } },
                backgroundHue: { onPressed: () => { this.setColorDraggingTarget(inputs, "BACKGROUND", this.hueTarget) } },
                backgroundIntensity: { onPressed: () => { this.setColorDraggingTarget(inputs, "BACKGROUND", this.intensityTarget) } },
                sliding: { onPressed: () => inputs.pointers.primary.draggingTarget = this.slidingTarget },
                clear: { onPressed: () => this.clearStrokes() },
                undo: { onPressed: () => this.undo() },
                toggleClosed: { onPressed: () => this.brush.closed = !this.brush.closed },
                toggleLines: { onPressed: () => this.lines = !this.lines },                
                loadBackgroundImage: { onReleased: () => this.loadNewBackgroundImage() },
                clearBackgroundImage: { onPressed: () => this.clearBackgroundImage() },
                resetViewMatrix: { onPressed: () => this.matrix = aether.mat4.identity() },
                break: { onPressed: () => this.breakStroke() },
                windBackward: { onPressed: () => this.targetStroke = Math.max(this.targetStroke - 1, -1) },
                windForward: { onPressed: () => this.targetStroke = Math.min(this.targetStroke + 1, this.strokes.length - 1) },
                windBeginning: { onPressed: () => this.targetStroke = -1 },
                windEnd: { onPressed: () => this.targetStroke = this.strokes.length - 1 },
                windFast: { onPressed: () => this.fastWind = true, onReleased: () => this.fastWind = false },
                save: { onReleased: () => this.save() },
                load: { onReleased: () => this.load() },
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() },
                resizeCanvas: { onPressed: () => this.resizeCanvas() },
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
            onRender: () => this.render()
        }
    }
    
    animate(time: number, delta: number): void {
        // TODO optimize by only updating distance when there is a relevant change.
        if (this.strokes.length === 0) {
            return
        }
        if (this.fastWind) {
            this.windInstantly()
            return
        }
        const maxDistDelta = windingSpeed * delta / 1000
        const distDelta = 
              this.distance.strokeIndex < this.targetStroke ?  maxDistDelta 
            : this.distance.strokeIndex > this.targetStroke ? -maxDistDelta 
            : this.distance.strokeIndex >= 0 && this.distance.distance < this.strokes[this.distance.strokeIndex].visibleLength - maxDistDelta ? maxDistDelta 
            : 0
        this.distance = distDelta !== 0 ? this.visibleDistancePlus(distDelta) : { ...this.distance, distance: Number.POSITIVE_INFINITY }
    }

    render() {
        const c = this.backgroundColor.rgba
        const attachment: GPURenderPassColorAttachment = { ...this.canvas.attachment({ r: c[0], g: c[1], b: c[2], a: c[3] }), storeOp: "store" }
        if (this.backgroundGroup !== null) {
            this.backgroundRenderer.renderTo(attachment,this.backgroundGroup, this.viewGroup)
            attachment.loadOp = "load"
            attachment.storeOp = "discard"
        }
        this.renderer.renderTo(
            attachment, 
            this.strokes.map((stroke, i) => {
                this.tessellatedStrokeFactory.strokeThickness = stroke.thickness
                this.tessellatedStrokeFactory.strokeTension = stroke.tension
                this.tessellatedStrokeFactory.strokeClosed = stroke.closed
                let distance = this.distance.strokeIndex === i ? Math.min(this.distance.distance / stroke.visibleLength, 1) : (i < this.distance.strokeIndex ? 1 : 0)
                return {
                    group: stroke.strokeGroup(points => this.renderer.stroke(
                        this.brush.dataBuffer(stroke.attributes),
                        this.tessellatedStrokeFactory.tesselate(points)
                    )),
                    closed: stroke.closed,
                    skipInitalCap: stroke.skipInitalCap,
                    distance
                }
            }), 
            this.viewGroup
        )
    }

    private breakStroke() {
        const stroke = this.strokes.pop()
        if (stroke !== undefined) {
            const strokes = stroke.break()
            this.strokes.push(...strokes)
        }
        this.resetDistance()
    }

    private setColorDraggingTarget(inputs: gear.loops.LoopInputs<ToyDescriptor>, color: "BRUSH" | "BACKGROUND", draggingTarget: gear.loops.DraggingTarget) {
        this.currentColor = color; inputs.pointers.primary.draggingTarget = draggingTarget
    }

    private clearBackgroundImage() {
        if (this.backgroundGroup !== null) {
            this.backgroundGroup.entries.background_texture.baseResource().destroy()
            this.backgroundGroup = null
        }
    }

    private async loadNewBackgroundImage() {
        const file = await this.imageFileSelector.select()
        if (file.length == 1) {
            const imageBitmap = await createImageBitmap(file[0])
            const texture = this.canvas.device.texture({
                size: [imageBitmap.width, imageBitmap.height],
                format: this.canvas.format,
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
            })
            this.canvas.device.wrapped.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: texture.wrapped }, [imageBitmap.width, imageBitmap.height])
            if (this.backgroundGroup !== null) {
                this.backgroundGroup.entries.background_texture.baseResource().destroy()
            }
            this.backgroundGroup = await this.backgroundRenderer.background(texture)
        }
    }

    private undo(): void {
        this.strokes.pop()?.destroy()
        this.resetDistance()
    }

    private clearStrokes(): void {
        this.strokes.forEach(s => s.destroy())
        this.strokes = []
        this.resetDistance()
    }

    private save(): void {
        const indices = new Map<gpu.DataBuffer, number>()
        const strokes: SerializableStroke[] = []
        const attributes: cmn.StrokeAttributes[] = []
        for (const s of this.strokes) {
            let buffer = this.brush.dataBuffer(s.attributes)
            let index = indices.get(buffer)
            if (index === undefined) {
                index = attributes.length
                attributes.push(s.attributes)
                indices.set(buffer, index)
            }
            strokes.push({
                attributes: index,
                points: s.points.map(p => p.position)
            })
        }
        const sketch: Sketch = {
            strokes,
            strokesAttributes: attributes.map(toSerializableAttributes),
            backgroundColor: toHex(this.backgroundColor.rgba)
        }
        gear.save(URL.createObjectURL(new Blob([JSON.stringify(sketch)])), 'application/json', 'Sketch.json')
    }

    private async load(): Promise<void> {
        const file = await this.jsonFileSelector.select()
        if (file.length == 1) {
            const text = await file[0].text()
            const sketch: Sketch = JSON.parse(text)
            this.clearStrokes()
            this.backgroundColor.rgba = typeof sketch.backgroundColor === "string" ? fromHex(sketch.backgroundColor) : sketch.backgroundColor
            for (const s of sketch.strokes) {
                const attributes = fromSerializableAttributes(sketch.strokesAttributes[s.attributes])
                const stroke = new Stroke(attributes, attributes => this.brush.destroyDataBuffer(attributes))
                for (const p of s.points) {
                    stroke.addPoint(p)
                }
                stroke.finalize()
                this.strokes.push(stroke)
            }
        }
        this.resetDistance()
    }

    private visibleDistancePlus(delta: number): Distance {
        if (this.strokes.length === 0 || delta === 0) {
            return this.distance
        }
        let i = this.distance.strokeIndex
        let s = this.strokes[i]
        let d = Math.min(this.distance.distance, s.visibleLength) + delta
        while (i < this.strokes.length - 1 && d > s.visibleLength) {
            d -= s.visibleLength
            s = this.strokes[++i]
        }
        while (i > 0 && d < 0) {
            s = this.strokes[--i]
            d += s.visibleLength
        }
        i = Math.min(Math.max(i, 0), this.strokes.length - 1)
        d = Math.min(Math.max(d, 0), s.visibleLength)
        return { strokeIndex: i, distance: d }
    }

    private resetDistance() {
        this.targetStroke = this.strokes.length - 1
        this.windInstantly()
    }

    private windInstantly() {
        this.distance = { strokeIndex: Math.max(this.targetStroke, 0), distance: this.targetStroke < 0 ? 0 : Number.POSITIVE_INFINITY }
    }

    private resizeCanvas() {
        const width = parseInt((document.getElementById("canvas-width") as HTMLInputElement).value)
        const height = parseInt((document.getElementById("canvas-height") as HTMLInputElement).value)
        if (!isNaN(width) && !isNaN(height)) {
            this.canvas.element.width = width
            this.canvas.element.height = height
            this.view.width = width
            this.view.height = height
            this.canvas.resize()
            this.renderer.updateView(this.viewGroup, this.view)
        }
    }

}

type Distance = {
    strokeIndex: number
    distance: number
}

type Sketch = {
    strokes: SerializableStroke[]
    strokesAttributes: SerializableStrokeAttributes[]
    backgroundColor: aether.Vec4 | string
}

type SerializableStroke = {
    attributes: number
    points: aether.Vec2[]
}

type SerializableStrokeAttributes = {
    color: aether.Vec4 | string,
    thickness: number,
    tension: number,
    closed: boolean,
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

function toSerializableAttributes(a: cmn.StrokeAttributes): SerializableStrokeAttributes {
    return {
        color: toHex(a.color),
        thickness: Math.round(a.thickness),
        tension: Math.round(a.tension),
        closed: a.closed === 1
    }
}

function fromSerializableAttributes(serializableAttributes: SerializableStrokeAttributes): cmn.StrokeAttributes {
    return {
        color: typeof serializableAttributes.color === "string" ? fromHex(serializableAttributes.color) : serializableAttributes.color,
        thickness: serializableAttributes.thickness,
        tension: serializableAttributes.tension,
        closed: serializableAttributes.closed ? 1 : 0
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
