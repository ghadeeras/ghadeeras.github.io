import * as Ether from "../../ether/latest/index.js"
import { View } from "./view.js"
import * as Gear from "../gear/all.js"
import { Vec, vec2 } from "../../ether/latest/index.js"

let audioContext: AudioContext | null = null

let center: Vec<2> = [-0.75, 0]
let scale = 2

let vertexShaderCode: string
let fragmentShaderCode: string

let mouseBindingElement: HTMLInputElement
let canvas: Gear.ElementEvents

let mandelbrotView: View
let juliaView: View

let centerSpan: Gear.Sink<Vec<2>>
let scaleSpan: Gear.Sink<number>
let hueSpan: Gear.Sink<number>
let saturationSpan: Gear.Sink<number>
let intensitySpan: Gear.Sink<number>
let paletteSpan: Gear.Sink<number>
let clickPosSpan: Gear.Sink<Vec<2>>

export function init() {
    window.onload = () => Gear.load("/shaders", doInit,
        ["mandelbrot.vert", shader => vertexShaderCode = shader],
        ["mandelbrot.frag", shader => fragmentShaderCode = shader]
    )
}

function doInit() {
    mouseBindingElement = document.getElementById("mouse-binding") as HTMLInputElement;
    mouseBindingElement.onkeypress = e => {
        e.preventDefault()
    }
    window.onkeypress = (e: KeyboardEvent) => {
        const key = e.key.toUpperCase()
        const act = action(key)
        if (act != null) {
            mouseBindingElement.value = act;
        }
    }

    mandelbrotView = new View(false, "canvas-gl", vertexShaderCode, fragmentShaderCode, center, scale)
    juliaView = new View(true, "julia-gl", vertexShaderCode, fragmentShaderCode, [0, 0], 4)

    centerSpan = Gear.sinkFlow(flow => flow
        .defaultsTo(center)
        .map(pos => pos.map(c => c.toPrecision(3)))
        .map(pos => "( " + pos[0] + ", " + pos[1] + ")")
        .to(Gear.text("center"))
    )
    scaleSpan = Gear.sinkFlow(flow => flow
        .defaultsTo(scale)
        .map(s => s.toPrecision(3).toString())
        .to(Gear.text("scale"))
    )
    hueSpan = Gear.sinkFlow(flow => flow
        .defaultsTo(mandelbrotView.hue)
        .map(h => h.toPrecision(3).toString())
        .to(Gear.text("hue"))
    )
    saturationSpan = Gear.sinkFlow(flow => flow
        .defaultsTo(mandelbrotView.saturation)
        .map(s => s.toPrecision(3).toString())
        .to(Gear.text("saturation"))
    )
    intensitySpan = Gear.sinkFlow(flow => flow
        .defaultsTo(mandelbrotView.intensity)
        .map(i => i.toPrecision(3).toString())
        .to(Gear.text("intensity"))
    )
    paletteSpan = Gear.sinkFlow(flow => flow
        .defaultsTo(mandelbrotView.palette)
        .map(s => s.toPrecision(3).toString())
        .to(Gear.text("palette"))
    )
    clickPosSpan = Gear.sinkFlow(flow => flow
        .defaultsTo(center)
        .map(pos => pos.map(c => c.toPrecision(9)))
        .map(pos => "(" + pos[0] + ", " + pos[1] + ")")
        .to(Gear.text("clickPos"))
    )

    canvas = Gear.ElementEvents.create("canvas-gl")
    canvas.dragging.branch(
        flow => flow.filter(selected("move")).producer(d => move(d)),
        flow => flow.filter(selected("zoom")).producer(d => zoom(d)),
        flow => flow.filter(selected("color")).producer(d => colorize(d)),
        flow => flow.filter(selected("intensity")).producer(d => intensity(d)),
        flow => flow.filter(selected("palette")).producer(d => palette(d)),
        flow => flow.filter(selected("julia")).producer(d => julia(d)),
    )

    Gear.Flow.from(canvas.clickPos, canvas.touchStartPos.map(ps => ps[0]))
        .map(pos => toComplexNumber(pos))
        .branch(flow => flow.to(clickPosSpan))
        .filter(selected("music"))
        .producer(c => play(c))
}

function play(c: Vec<2>) {
    if (audioContext == null) {
        audioContext = new window.AudioContext({sampleRate: 9450})
    }
    const audioBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate)
    
    const channel1 = audioBuffer.getChannelData(0)
    const channel2 = audioBuffer.getChannelData(1)
    let sum1 = 0
    let sum2 = 0
    let z: Vec<2> = [0, 0]
    for (let i = 0; i < audioBuffer.length && vec2.length(z) < 2.0; i++) {
        const [x, y] = z
        z = vec2.add([x * x - y * y, 2 * x * y], c)
        channel1[i] = z[0] / 2
        channel2[i] = z[1] / 2
        sum1 += channel1[i]
        sum2 += channel2[i]
    }
    if (vec2.length(z) < 2.0) {
        const avg1 = sum1 / channel1.length
        const avg2 = sum2 / channel2.length
        for (let i = 0; i < audioBuffer.length; i++) {
            const attenuation = Math.pow(1 - i / audioBuffer.length, 2)
            channel1[i] = attenuation * (channel1[i] - avg1)
            channel2[i] = attenuation * (channel2[i] - avg2)
        }
        playBuffer(audioContext, audioBuffer)
    }
}

function playBuffer(audioContext: AudioContext, audioBuffer: AudioBuffer) {
    const source = audioContext.createBufferSource()
    source.channelCount = 2
    source.buffer = audioBuffer
    source.connect(audioContext.destination)
    source.start()
}

function toComplexNumber(pos: Gear.PointerPosition): Vec<2> {
    return vec2.add(
        vec2.scale(toVector(pos), scale),
        center
    )
}

function toVector(pos: Gear.PointerPosition): Vec<2> {
    return vec2.add(
        vec2.div(
            pos,
            [canvas.element.clientWidth / 2, -canvas.element.clientHeight / 2]
        ),
        [-1, 1]
    )
}

function action(key: string) {
    switch (key.toUpperCase()) {
        case "M": return "move"
        case "Z": return "zoom"
        case "C": return "color"
        case "I": return "intensity"
        case "P": return "palette"
        case "J": return "julia"
        case "N": return "music"
        default: return null
    }
}

function selected<T>(value: string): Gear.Predicate<T> {
    return () => mouseBindingElement.value == value;
}

function zoom(dragging: Gear.Dragging) {
    const delta = calculateDelta(dragging.startPos, dragging.pos)
    const power = -delta[1]
    if (power != 0) {
        const centerToStart = calculateDelta(canvas.center, dragging.startPos, scale)
        const factor = 16 ** power
        const newScale = scale * factor
        const newCenter = vec2.add(center, vec2.scale(centerToStart, 1 - factor))
        if (dragging.end) {
            scale = newScale
            center = newCenter
        }
        mandelbrotView.scale = newScale
        mandelbrotView.center = newCenter
        scaleSpan.consumer(newScale)
        centerSpan.consumer(newCenter)
    }
}

function move(dragging: Gear.Dragging) {
    const delta = calculateDelta(dragging.startPos, dragging.pos, scale)
    if (vec2.length(delta) > 0) {
        const newCenter = vec2.max(
            vec2.min(
                vec2.sub(center, delta),
                [+4, +4]
            ),
            [-4, -4]
        )
        if (dragging.end) {
            center = newCenter
        }
        mandelbrotView.center = newCenter
        centerSpan.consumer(newCenter)
    }
}

function colorize(dragging: Gear.Dragging) {
    const hue = 2 * dragging.pos[0] / canvas.element.clientWidth
    const saturation = 1 - dragging.pos[1] / canvas.element.clientHeight
    mandelbrotView.setColor(hue, saturation)
    juliaView.setColor(hue, saturation)
    hueSpan.consumer(hue)
    saturationSpan.consumer(saturation)
}

function intensity(dragging: Gear.Dragging) {
    const intensity = 1 - dragging.pos[1] / canvas.element.clientWidth
    mandelbrotView.intensity = intensity
    juliaView.intensity = intensity
    intensitySpan.consumer(intensity)
}

function palette(dragging: Gear.Dragging) {
    const p = 1.5 - 2 * dragging.pos[1] / canvas.element.clientWidth
    const palette = p > 1 ? 1 : p < 0 ? 0 : p
    mandelbrotView.palette = palette
    juliaView.palette = palette
    paletteSpan.consumer(palette)
}

function julia(dragging: Gear.Dragging) {
    const complexNumber = toComplexNumber(dragging.pos)
    juliaView.juliaNumber = complexNumber
}

function calculateDelta(pos1: Gear.PointerPosition, pos2: Gear.PointerPosition, scale: number = 1) {
    return vec2.div(
        vec2.scale(
            vec2.sub(pos2, pos1), 
            2 * scale
        ), 
        [canvas.element.clientWidth, -canvas.element.clientHeight]
    )
}
