import * as misc from "../utils/misc.js"
import { aether, gear } from "/gen/libs.js"
import { view, View } from "./view.js"
import { positionDragging } from "../utils/dragging.js"
import { Controller, ControllerEvent } from "../initializer.js"

let audioContext: AudioContext

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/mandelbrot"
export const huds = {
    "monitor": "monitor-button"
}

export async function init(controller: Controller) {
    const canvas = gear.ElementEvents.create("canvas")
    const mandelbrotView = await view(false, canvas.element.id, [-0.75, 0], 2)
    const toComplexNumber = (p: gear.PointerPosition) => aether.vec2.add(
        aether.vec2.scale(aether.vec2.mul(
            p, 
            [canvas.element.clientWidth / canvas.element.clientHeight, 1]
        ), mandelbrotView.scale), 
        mandelbrotView.center
    )

    const transformation = transformationTarget(mandelbrotView)
    const color = colorTarget(mandelbrotView)
    const intensity = intensityTarget(mandelbrotView)

    const pressedKey = new gear.Value((c: gear.Consumer<ControllerEvent>) => controller.handler = e => { c(e); return false })
        .filter(e => e.down)
        .map(e => e.key)
        .attach(k => {
            switch (k) {
                case "x": mandelbrotView.xray = !mandelbrotView.xray; break;
                case "h": mandelbrotView.crosshairs = !mandelbrotView.crosshairs; break;
            }
        })
        .filter(k => k in keyMappings || k === "n")
        .defaultsTo("m")
        .reduce((previous, current) => {
            control(previous).removeAttribute("style")
            control(current).setAttribute("style", "font-weight: bold")
            return current
        }, "m")

    const cases = {
        move: new gear.Value<gear.Dragging>(),
        zoom: new gear.Value<gear.Dragging>(),
        color: new gear.Value<gear.Dragging>(),
        intensity: new gear.Value<gear.Dragging>(),
    }

    const keyMappings = {
        "m": cases.move,
        "z": cases.zoom,
        "c": cases.color,
        "i": cases.intensity,
    }

    canvas.dragging.value.switch(pressedKey, keyMappings)

    transformation.value = gear.Value.from(
        cases.move.then(gear.drag(new Move(mandelbrotView))),
        cases.zoom.then(gear.drag(new Zoom(mandelbrotView)))
    ).defaultsTo(mandelbrotView)

    color.value = cases.color
        .then(gear.drag(positionDragging))
        .map(([x, y]) => aether.vec2.of(x + 1, (y + 1) / 2))
        .defaultsTo([mandelbrotView.hue, mandelbrotView.saturation])

    intensity.value = cases.intensity
        .then(gear.drag(positionDragging))
        .map(([_, y]) => (y + 1) / 2)
        .defaultsTo(mandelbrotView.intensity)

    const clickPos = canvas.pointerDown.value.map(canvas.positionNormalizer)

    gear.text("clickPos").value = clickPos
        .map(pos => toFixedVec(pos, 9))
        .defaultsTo(toFixedVec([0, 0], 9))

    clickPos
        .then(gear.flowSwitch(pressedKey.map(v => v === "n")))
        .map(toComplexNumber)
        .attach(play)
}

function control(previous: string) {
    return misc.required(document.getElementById(`control-${previous}`))
}

function intensityTarget(mandelbrotView: View) {
    const intensityWatch = text("intensity")
    const intensity = new gear.Target<number>(intensity => {
        mandelbrotView.intensity = intensity
        intensityWatch(toFixed(intensity))
    })
    return intensity
}

function colorTarget(mandelbrotView: View) {
    const hueWatch = text("hue")
    const saturationWatch = text("saturation")
    const color = new gear.Target<aether.Vec<2>>(color => {
        const [hue, saturation] = color
        mandelbrotView.setColor(hue, saturation)
        hueWatch(toFixed(hue))
        saturationWatch(toFixed(saturation))
    })
    return color
}

function transformationTarget(mandelbrotView: View) {
    const centerWatch = text("center")
    const scaleWatch = text("scale")
    const transformation = new gear.Target<Transformation>(t => {
        mandelbrotView.scale = t.scale
        mandelbrotView.center = t.center
        centerWatch(toFixedVec(t.center, 9))
        scaleWatch(toFixed(t.scale, 9))
    })
    return transformation
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

function toFixedVec<D extends aether.Dim>(v: aether.Vec<D>, digits = 3) {
    const coords = v.map(c => toFixed(c, digits))
    const commaSeparatedCoords = coords[0].concat(...coords.slice(1).map(s => `, ${s}`))
    return `(${commaSeparatedCoords})`
}

function toFixed(c: number, digits: number = 3) {
    let s = c.toFixed(digits)
    return s.startsWith("-") ? s : " " + s
}

function play(c: aether.Vec<2>) {
    if (audioContext == null) {
        audioContext = new window.AudioContext({sampleRate: 9450})
    }
    const audioBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate)
    
    const channel1 = audioBuffer.getChannelData(0)
    const channel2 = audioBuffer.getChannelData(1)
    let sum1 = 0
    let sum2 = 0
    let z: aether.Vec<2> = [0, 0]
    for (let i = 0; i < audioBuffer.length && aether.vec2.length(z) < 2.0; i++) {
        const [x, y] = z
        z = aether.vec2.add([x * x - y * y, 2 * x * y], c)
        channel1[i] = z[0] / 2
        channel2[i] = z[1] / 2
        sum1 += channel1[i]
        sum2 += channel2[i]
    }
    if (aether.vec2.length(z) < 2.0) {
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

type Transformation = {
    scale: number,
    center: aether.Vec<2>
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
            const aspect = this.view.canvas.width / this.view.canvas.height
            const bounds: aether.Vec2 = aspect >= 1 ? [aspect, 1] : [1, 1 / aspect]
            const delta = aether.vec2.mul(calculateDelta(from, to), bounds)
            const power = -delta[1]
            const factor = 16 ** power
            return power == 0 ? value : {
                scale: value.scale * factor,
                center: aether.vec2.sub(
                    value.center, 
                    aether.vec2.scale(
                        calculateDelta([0, 0], aether.vec2.mul(from, bounds), value.scale), 
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
            const aspect = this.view.canvas.width / this.view.canvas.height
            const bounds: aether.Vec2 = aspect >= 1 ? [aspect, 1] : [1, 1 / aspect]
            const delta = aether.vec2.mul(calculateDelta(from, to, value.scale), bounds)
            return {
                scale: value.scale,
                center: aether.vec2.max(
                    aether.vec2.min(
                        aether.vec2.sub(value.center, delta),
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

function calculateDelta(pos1: gear.PointerPosition, pos2: gear.PointerPosition, scale = 1) {
    return aether.vec2.scale(
        aether.vec2.sub(pos2, pos1), 
        scale
    )
}
