import { gpu } from "lumen"
import * as gear from "gear"
import * as aether from "aether"
import { LinearDragging, TranslationDragging } from "../utils/dragging.js"
import { Renderer } from "./stroke.renderer.js"
import { TessellatedStrokeFactory } from "./stroke.computer.js"
import { Stroke } from "./stroke.js"
import { Brush } from "./brush.js"
import { BackgroundGroup, BackgroundRenderer } from "./bg.renderer.js"
import * as cmn from "./common.js"
import { hideCurrentHud, showHud } from "../initializer.js"
import { Palette } from "../utils/palette.js"
import { Color, fromHex, toHex } from "../utils/color.js"

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/sketch"
export const huds = {
    "monitor": "monitor-button",
    "palette": null
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
                fgColor: {
                    physicalKeys: [["KeyH"]],
                    virtualKeys: "#control-h"
                },
                bgColor: {
                    physicalKeys: [["ShiftRight", "KeyH"], ["ShiftLeft", "KeyH"]],
                    virtualKeys: ".control-bg-h"
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
                mark: {
                    physicalKeys: [["KeyM"]],
                    virtualKeys: "#control-mark"
                },
                windToMark: {
                    physicalKeys: [["ControlLeft", "KeyM"], ["ControlRight", "KeyM"]],
                    virtualKeys: ".control-wind-to-mark"
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
                paste: {
                    physicalKeys: [["KeyP"]],
                    virtualKeys: ".control-paste"
                },
                record: {
                    physicalKeys: [["KeyV"]],
                    virtualKeys: "#control-v"
                },
                export: {
                    physicalKeys: [["KeyX"]],
                    virtualKeys: "#control-export"
                },
                resizeCanvas: {
                    physicalKeys: [["KeyR"]],
                    virtualKeys: "#control-resize-canvas"
                },
                cancel: {
                    physicalKeys: [["Escape"]],
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

    private viewGroup: cmn.ViewBindGroup
    private backgroundGroup: BackgroundGroup | null = null
    private strokes: Stroke[] = []
    private distance: Distance = { strokeIndex: 0, distance: 0 }
    private targetStroke = -1
    private markedStroke: number | null = null
    private fastWind = false
    private brush = new Brush(this.canvas.device, this.canvas.element)
    private lines = false
    private backgroundColor = new Color([0, 0, 0, 0], () => {
        const bg = this.backgroundColor.rgba
        const fg = aether.vec4.mix(0.75, bg, aether.vec4.from(aether.vec4.add(bg, [0.5, 0.5, 0.5, 0]).map(c => c - Math.floor(c))))
        this.brush.container.style.setProperty("--bg-color", `#${toHex(bg).substring(0, 6)}FF`)
        this.brush.container.style.setProperty("--fg-color", `#${toHex(fg).substring(0, 6)}FF`)
        this.brush.borderElement.style.setProperty("border-color", `#${toHex(fg).substring(0, 6)}FF`)
    })
    
    private inverseViewMatrix = aether.mat3.identity()
    private viewMatrix = aether.mat3.identity()

    private strokeTarget = gear.loops.draggingTarget(
        gear.property(this, "stroke"),
        new StrokeSampler(p => this.infiniteCanvasSpacePos(p))
    )
    private brushSizeTarget = gear.loops.draggingTarget(
        gear.property(this.brush, "thickness"), 
        LinearDragging.dragger(8, 40, 20)
    )
    private tensionTarget = gear.loops.draggingTarget(
        gear.property(this, "tension"), 
        LinearDragging.dragger(2, 128, 64)
    )
    private slidingTarget = gear.loops.draggingTarget(
        gear.property(this, "matrix"), 
        TranslationDragging.dragger(() => {
            return aether.mat4.scaling(-2 / this.canvas.element.width, 2 / this.canvas.element.height, 1)
        }, 1)
    )

    private imageFileSelector = gear.FileSelector.create().disallowMultipleFiles().ofType("image/*")
    private jsonFileSelector = gear.FileSelector.create().disallowMultipleFiles().ofType("application/json")

    private pasteElement = gear.required(document.getElementById("paste")) as HTMLInputElement

    private canceller: () => void = () => {}

    constructor(
        private canvas: gpu.Canvas, 
        private renderer: Renderer, 
        private tessellatedStrokeFactory: TessellatedStrokeFactory, 
        private backgroundRenderer: BackgroundRenderer, 
        private palette: Palette
    ) {
        this.viewGroup = renderer.view(this.view)
        this.pasteElement.onpaste = e => this.paste(e)
        this.pasteElement.onbeforeinput = e => e.preventDefault()
    }

    static async create(): Promise<Toy> {
        try {
            const device = await gpuDevice()
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element, 4)
            canvas.context.configure({
                ...canvas.configs,
                alphaMode: "premultiplied",
            })
            const commonLayouts = cmn.groupLayouts(device)
            const renderer = await Renderer.create(commonLayouts)
            const tessellatedStrokeFactory = await TessellatedStrokeFactory.create(device)
            const backgroundRenderer = await BackgroundRenderer.create(commonLayouts.view)
            const palette = await Palette.create("palette", v => (v ? showHud : hideCurrentHud)("palette"))
            return new Toy(canvas, renderer, tessellatedStrokeFactory, backgroundRenderer, palette)
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
        const vm = this.viewMatrix
        this.brush.borderElement.style.transform = `matrix(${vm[0][0]}, ${vm[0][1]}, ${vm[1][0]}, ${vm[1][1]}, ${vm[2][0]}, ${vm[2][1]})`
    }

    get visibleDistance() {
        return this.distance
    }

    set visibleDistance(visibleDistance: Distance) {
        this.distance = visibleDistance
    }

    get tension() {
        return this.brush.tension
    }

    set tension(tension: number) {
        this.brush.tension = tension
        if (this.strokes.length > 0) {
            this.strokes[this.strokes.length - 1].tension = tension
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
                drawing: { onPressed: () => this.enterDrawingMode(inputs) },
                brushSize: { onPressed: () => this.enterBrushResizingMode(inputs) },
                tension: { onPressed: () => this.enterTensionAdjusingMode(inputs) },
                sliding: { onPressed: () => this.enterSlidingMode(inputs) },
                fgColor: { onPressed: () => { this.pickColor(this.brush.color) } },
                bgColor: { onPressed: () => { this.pickColor(this.backgroundColor) } },
                clear: { onPressed: () => this.clearStrokes() },
                undo: { onPressed: () => this.undo() },
                toggleClosed: { onPressed: () =>this.toggleClosed() },
                toggleLines: { onPressed: () => this.toggleLines() },                
                loadBackgroundImage: { onReleased: () => this.loadNewBackgroundImage() },
                clearBackgroundImage: { onPressed: () => this.clearBackgroundImage() },
                paste: { onReleased:() => this.paste() },
                resetViewMatrix: { onPressed: () => this.matrix = aether.mat4.identity() },
                break: { onPressed: () => this.breakStroke() },
                mark: { onPressed: () => this.markedStroke = this.targetStroke },
                windToMark: { onPressed: () => this.windToMark() },
                windBackward: { onPressed: () => this.targetStroke = Math.max(this.targetStroke - 1, -1) },
                windForward: { onPressed: () => this.targetStroke = Math.min(this.targetStroke + 1, this.strokes.length - 1) },
                windBeginning: { onPressed: () => this.targetStroke = -1 },
                windEnd: { onPressed: () => this.targetStroke = this.strokes.length - 1 },
                windFast: { onPressed: () => this.fastWind = true, onReleased: () => this.fastWind = false },
                save: { onReleased: () => this.save() },
                load: { onReleased: () => this.load() },
                record: { onPressed: () => this.startStopRecording(outputs) },
                export: { onPressed: () => this.export() },
                resizeCanvas: { onPressed: () => this.resizeCanvas() },
                cancel: { onReleased: () => this.cancel() },
            },
            pointers: {
                primary: {
                    defaultDraggingTarget: this.strokeTarget,
                    onMoved: () => this.brush.position = this.canvasSpacePos(inputs.pointers.primary.position)
                }
            }
        }
    }
    
    private toggleClosed() {
        if (this.strokes.length > 0) {
            const lastStroke = this.strokes[this.strokes.length - 1]
            lastStroke.closed = !lastStroke.closed
        }
    }

    private enterDrawingMode(inputs: gear.loops.LoopInputs<ToyDescriptor>): void {
        inputs.pointers.primary.draggingTarget = this.strokeTarget
        this.brush.visible = true
        this.canvas.element.style.cursor = "none"
    }

    private enterSlidingMode(inputs: gear.loops.LoopInputs<ToyDescriptor>): void {
        inputs.pointers.primary.draggingTarget = this.slidingTarget
        this.brush.visible = false
        this.canvas.element.style.cursor = "all-scroll"
    }

    private enterBrushResizingMode(inputs: gear.loops.LoopInputs<ToyDescriptor>): void {
        inputs.pointers.primary.draggingTarget = this.brushSizeTarget
        this.brush.visible = true
        this.canvas.element.style.cursor = "row-resize"
    }

    private enterTensionAdjusingMode(inputs: gear.loops.LoopInputs<ToyDescriptor>): void {
        inputs.pointers.primary.draggingTarget = this.tensionTarget
        this.brush.visible = false
        this.canvas.element.style.cursor = "row-resize"
    }

    private toggleLines() {
        this.lines = !this.lines
        this.brush.lines = !this.brush.lines
    }

    private cancel(): void {
        this.canceller()
        this.canceller = () => {}
        hideCurrentHud()
    }

    private async pickColor(color: Color) {
        this.canceller()
        this.canceller = () => this.palette.cancel()
        color.rgba = await this.palette.pick(color.rgba)
    }

    async paste(e: ClipboardEvent | undefined = undefined) {
        if (e !== undefined && e.clipboardData) {
            e.preventDefault()
            for (const file of e.clipboardData.files) {
                if (file.type.startsWith("image/")) {
                    this.loadBackgroundImage(file)
                }
            }
            this.pasteElement.blur()
        } else {
            try {
                const items = await navigator.clipboard.read()
                for (const item of items) {
                    if (item.types.some(type => type.startsWith("image/"))) {
                        let content = await item.getType("image/png")
                        this.loadBackgroundImage(content)
                    }
                }
            } catch (error) {
                showHud("controls")
                this.pasteElement.focus()
            }
        }
        window.focus()
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
        const attachment: GPURenderPassColorAttachment = { ...this.canvas.attachment({ 
            r: c[0] * c[3], g: c[1] * c[3], b: c[2] * c[3], a: c[3] 
        }), storeOp: "store" }
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

    private clearBackgroundImage() {
        if (this.backgroundGroup !== null) {
            this.backgroundGroup.entries.background_texture.baseResource().destroy()
            this.backgroundGroup = null
        }
    }

    private async loadNewBackgroundImage() {
        const file = await this.imageFileSelector.select()
        if (file.length == 1) {
            await this.loadBackgroundImage(file[0])
        }
    }

    private async loadBackgroundImage(f: File | Blob) {
        const imageBitmap = await createImageBitmap(f)
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
        this.resizeCanvas([imageBitmap.width, imageBitmap.height])
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

    private export(): void {
        let imageUrl = this.canvas.element.toDataURL("image/png")
        gear.save(imageUrl, 'image/png', 'Sketch.png')
    }

    private windToMark(): void {
        if (this.markedStroke !== null) {
            [this.targetStroke, this.markedStroke] = [this.markedStroke, this.targetStroke];
        }
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
            this.backgroundColor.rgba = typeof sketch.backgroundColor === "string" ? fromHex(sketch.backgroundColor, this.backgroundColor.rgba) : sketch.backgroundColor
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

    private widthElement = document.getElementById("canvas-width") as HTMLInputElement
    private heightElement = document.getElementById("canvas-height") as HTMLInputElement

    private resizeCanvas(size: aether.Vec2 | undefined = undefined) {
        let width = parseInt((document.getElementById("canvas-width") as HTMLInputElement).value)
        let height = parseInt((document.getElementById("canvas-height") as HTMLInputElement).value)
        if (size !== undefined) {
            [width, height] = size
            this.widthElement.value = width.toFixed(0)
            this.heightElement.value = height.toFixed(0)
        }
        if (!isNaN(width) && !isNaN(height)) {
            this.canvas.element.width = width
            this.canvas.element.height = height
            this.view.width = width
            this.view.height = height
            this.canvas.resize()
            this.renderer.updateView(this.viewGroup, this.view)
            this.brush.borderElement.style.width = `${width}px`
            this.brush.borderElement.style.height = `${height}px`
        }
    }

    private startStopRecording(outputs: gear.loops.LoopOutputs<ToyDescriptor>) {
        if (outputs.canvases.scene.recorder.state !== "recording") {
            this.matrix = aether.mat4.identity()
        }
        outputs.canvases.scene.recorder.startStop()
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
        color: typeof serializableAttributes.color === "string" ? fromHex(serializableAttributes.color, [0, 0, 0, 0]) : serializableAttributes.color,
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
