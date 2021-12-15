import * as gear from "gear"
import { Vec, vec2 } from "ether"
import { view, View } from "./view.js"
import { positionDragging } from "../utils/dragging.js"

let audioContext: AudioContext

export function init() {
    window.onload = () => doInit()
}

async function doInit() {
    const mandelbrotView = await view(false, "canvas-gl", [-0.75, 0], 2)
    const juliaView = await view(true, "julia-gl", [0, 0], 4)
    const toComplexNumber = (p: gear.PointerPosition) => vec2.add(vec2.scale(p, mandelbrotView.scale), mandelbrotView.center)

    const transformation = transformationTarget(mandelbrotView)
    const color = colorTarget(mandelbrotView, juliaView)
    const intensity = intensityTarget(mandelbrotView, juliaView)
    const palette = paletteTarget(mandelbrotView, juliaView)
    const julia = juliaTarget(juliaView)

    const canvas = gear.ElementEvents.create("canvas-gl")
    const mouseBinding = mouseBindingValue()

    const cases = {
        move: new gear.Value<gear.Dragging>(),
        zoom: new gear.Value<gear.Dragging>(),
        color: new gear.Value<gear.Dragging>(),
        intensity: new gear.Value<gear.Dragging>(),
        palette: new gear.Value<gear.Dragging>(),
        julia: new gear.Value<gear.Dragging>(),
    }
    canvas.dragging.value.switch(mouseBinding, cases)

    transformation.value = gear.Value.from(
        cases.move.then(gear.drag(new Move(mandelbrotView))),
        cases.zoom.then(gear.drag(new Zoom(mandelbrotView)))
    ).defaultsTo(mandelbrotView)

    color.value = cases.color
        .then(gear.drag(positionDragging))
        .map(([x, y]) => vec2.of(x + 1, (y + 1) / 2))
        .defaultsTo([mandelbrotView.hue, mandelbrotView.saturation])

    intensity.value = cases.intensity
        .then(gear.drag(positionDragging))
        .map(([x, y]) => (y + 1) / 2)
        .defaultsTo(mandelbrotView.intensity)

    palette.value = cases.palette
        .then(gear.drag(positionDragging))
        .map(([x, y]) => y * 2)
        .defaultsTo(mandelbrotView.palette)

    julia.value = cases.julia
        .then(gear.drag(positionDragging))
        .map(toComplexNumber)
        .defaultsTo(juliaView.juliaNumber)

    const clickPos = canvas.pointerDown.value.map(canvas.positionNormalizer)

    gear.text("clickPos").value = clickPos
        .map(pos => toString(pos, 9))
        .defaultsTo(toString([0, 0], 9))

    clickPos
        .then(gear.flowSwitch(mouseBinding.map(v => v === "music")))
        .map(toComplexNumber)
        .attach(play)
}

function juliaTarget(juliaView: View) {
    return new gear.Target<Vec<2>>(c => {
        juliaView.juliaNumber = c
    })
}

function paletteTarget(mandelbrotView: View, juliaView: View) {
    const paletteWatch = text("palette")
    const palette = new gear.Target<number>(p => {
        const palette = p > 0.75 ? 1 : p < -0.75 ? 0 : (p + 0.75) / 1.5
        mandelbrotView.palette = palette
        juliaView.palette = palette
        paletteWatch(palette.toPrecision(3))
    })
    return palette
}

function intensityTarget(mandelbrotView: View, juliaView: View) {
    const intensityWatch = text("intensity")
    const intensity = new gear.Target<number>(intensity => {
        mandelbrotView.intensity = intensity
        juliaView.intensity = intensity
        intensityWatch(intensity.toPrecision(3))
    })
    return intensity
}

function colorTarget(mandelbrotView: View, juliaView: View) {
    const hueWatch = text("hue")
    const saturationWatch = text("saturation")
    const color = new gear.Target<Vec<2>>(color => {
        const [hue, saturation] = color
        mandelbrotView.setColor(hue, saturation)
        juliaView.setColor(hue, saturation)
        hueWatch(hue.toPrecision(3))
        saturationWatch(saturation.toPrecision(3))
    })
    return color
}

function transformationTarget(mandelbrotView: View) {
    const centerWatch = text("center")
    const scaleWatch = text("scale")
    const transformation = new gear.Target<Transformation>(t => {
        mandelbrotView.scale = t.scale
        mandelbrotView.center = t.center
        centerWatch(toString(t.center))
        scaleWatch(t.scale.toPrecision(3))
    })
    return transformation
}

function mouseBindingValue() {
    const mouseBinding = gear.readableValue("mouse-binding")
    const mouseBindingElement = document.getElementById("mouse-binding") as HTMLInputElement
    mouseBindingElement.onkeyup = mouseBindingElement.onkeydown = e => {
        e.preventDefault()
    }
    window.onkeypress = (e: KeyboardEvent) => {
        const key = e.key.toUpperCase()
        const act = action(key)
        if (act != null) {
            mouseBindingElement.value = act
            mouseBinding.flow(act)
        }
    }
    return mouseBinding.defaultsTo("move")
}

function text(elementId: string): gear.Consumer<string> {
    const element = document.getElementById(elementId)
    if (!element) {
        throw new Error(`Element with id '${elementId}' not found!`)
    }
    const update: [string | null] = [null]
    return s => {
        if (update[0] == null) {
            setTimeout(() => {
                element.innerText = update[0] ?? element.innerText
                update[0] = null
            }, 100)
        }
        update[0] = s
    }
}

function toString(v: Vec<2>, precision: number = 3) {
    const [x, y] = v.map(c => c.toPrecision(precision))
    return `(${x}, ${y})`
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

type Transformation = {
    scale: number,
    center: Vec<2>
}

class Zoom implements gear.DraggingHandler<Transformation> {

    constructor(private view: View) {
    }

    currentValue(): Transformation {
        return {
            scale: this.view.scale,
            center: this.view.center
        }
    }

    mapper(value: Transformation, from: gear.PointerPosition): gear.DraggingPositionMapper<Transformation> {
        return to => {
            const delta = calculateDelta(from, to)
            const power = -delta[1]
            const factor = 16 ** power
            return power == 0 ? value : {
                scale: value.scale * factor,
                center: vec2.sub(
                    value.center, 
                    vec2.scale(
                        calculateDelta([0, 0], from, value.scale), 
                        factor - 1
                    )
                )
            }
        }
    }

    finalize(value: Transformation): Transformation {
        return value
    }

}

class Move implements gear.DraggingHandler<Transformation> {

    constructor(private view: View) {
    }

    currentValue(): Transformation {
        return {
            scale: this.view.scale,
            center: this.view.center
        }
    }

    mapper(value: Transformation, from: gear.PointerPosition): gear.DraggingPositionMapper<Transformation> {
        return to => {
            const delta = calculateDelta(from, to, value.scale)
            return {
                scale: value.scale,
                center: vec2.max(
                    vec2.min(
                        vec2.sub(value.center, delta),
                        [+4, +4]
                    ),
                    [-4, -4]
                )
            }
        }
    }

    finalize(value: Transformation): Transformation {
        return value
    }

}

function calculateDelta(pos1: gear.PointerPosition, pos2: gear.PointerPosition, scale: number = 1) {
    return vec2.scale(
        vec2.sub(pos2, pos1), 
        scale
    )
}
