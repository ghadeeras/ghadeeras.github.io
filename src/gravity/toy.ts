import { aether, gear } from '/gen/libs.js'
import * as dragging from '../utils/dragging.js'
import * as gpu from '../djee/gpu/index.js'
import * as misc from '../utils/misc.js'
import { Controller, ControllerEvent } from '../initializer.js'
import { BodyDescriptionStruct, BodyStateStruct, Universe, UniverseLayout } from './universe.js'
import { newRenderer, Renderer } from './renderer.js'
import { Engine, newEngine } from './physics.js'
import { Visuals, VisualsLayout } from './visuals.js'

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gravity"
export const video = "https://youtu.be/BrZm6LlOQlI"
export const huds = {
    "monitor": "monitor-button"
}

export async function init(controller: Controller) {
    const device = await gpuDevice()

    const canvas = device.canvas("canvas", 4)
    
    const universeLayout = new UniverseLayout(device)
    const universe = universeLayout.instance(...createUniverse(16384))
    const visualsLayout = new VisualsLayout(device)
    const visuals = visualsLayout.instance()
    const engine = await newEngine(universeLayout)
    const renderer = await newRenderer(device, canvas, visuals)

    const pressedKey = new gear.Value((c: gear.Consumer<ControllerEvent>) => controller.handler = e => {
        c(e)
        return false
    }).filter(e => e.down).map(e => e.key)
    const pauseResumeAction = animation(universe, renderer, engine)

    setupControls(canvas, universe, renderer, visuals, pressedKey)
    setupActions(universe, renderer, visuals, pauseResumeAction, pressedKey)
}

function setupControls(canvas: gpu.Canvas, universe: Universe, renderer: Renderer, visuals: Visuals, pressedKey: gear.Value<string>) {
    const universeRotation = new gear.Value<gear.Dragging>()
    const observerPosition = new gear.Value<gear.Dragging>()
    const bodyPointedness = new gear.Value<gear.Dragging>()
    const gravityConstant = new gear.Value<gear.Dragging>()
    const radiusScale = new gear.Value<gear.Dragging>()
    const zoom = new gear.Value<gear.Dragging>()

    const keyMappings = {
        "r": universeRotation,
        "p": observerPosition,
        "z": zoom,
        "s": radiusScale,
        "g": gravityConstant,
        "b": bodyPointedness,
    }

    const controller = pressedKey
        .filter(k => k in keyMappings)
        .defaultsTo("r")
        .reduce((previous, current) => {
            control(previous).removeAttribute("style")
            control(current).setAttribute("style", "font-weight: bold")
            return current
        }, "r")

    gear.elementEvents(canvas.element.id).dragging.value.switch(controller, keyMappings)

    universeRotation
        .then(gear.drag(new dragging.RotationDragging(
            () => visuals.modelMatrix,
            () => visuals.projectionViewMatrix
        )))
        .attach(m => visuals.modelMatrix = m)

    observerPosition
        .then(gear.drag(new dragging.LinearDragging(() => visuals.viewMatrix[3][2], -64, -1, 16)))
        .map(z => aether.mat4.lookAt([0, 0, z]))
        .attach(m => visuals.viewMatrix = m)

    bodyPointedness
        .then(gear.drag(new dragging.RatioDragging(() => universe.bodyPointedness, 0.001, 1000)))
        .attach(p => universe.bodyPointedness = p)

    gravityConstant
        .then(gear.drag(new dragging.RatioDragging(() => universe.gravityConstant, 1, 10000)))
        .attach(g => universe.gravityConstant = g)

    radiusScale
        .then(gear.drag(new dragging.RatioDragging(() => visuals.radiusScale, 0.001, 1)))
        .attach(s => visuals.radiusScale = s)

    zoom
        .then(gear.drag(new dragging.RatioDragging(() => visuals.zoom, 0.01, 100)))
        .attach(z => visuals.zoom = z)
}

function setupActions(universe: Universe, renderer: Renderer, visuals: Visuals, pauseResumeAction: () => void, pressedKey: gear.Value<string>) {
    const collapse = new gear.Value<string>()
    const kaboom = new gear.Value<string>()
    const reset = new gear.Value<string>()
    const pause = new gear.Value<string>()

    const keyMappings = {
        "1": collapse,
        "2": kaboom,
        "3": reset,
        "4": pause,
    }

    const controller = pressedKey
        .map(k => k in keyMappings ? k : "")
        .defaultsTo("")

    pressedKey.switch(controller, keyMappings)

    pause.attach(pauseResumeAction)
    reset.attach(() => {
        visuals.modelMatrix = aether.mat4.identity()
        visuals.viewMatrix = aether.mat4.lookAt([0, 0, -24])
        visuals.radiusScale = 0.06
        visuals.zoom = 1
        renderer.resize()
    })
    collapse.attach(() => {
        universe.bodyPointedness = 0.1
        universe.gravityConstant = 1000
        recreate(universe)
    })
    kaboom.attach(() => {
        universe.bodyPointedness = 5
        universe.gravityConstant = 25
        recreate(universe, 1)
    })
}

function control(previous: string) {
    return misc.required(document.getElementById(`control-${previous}`))
}

function animation(universe: Universe, renderer: Renderer, engine: Engine) {
    const freqMeter = misc.FrequencyMeter.create(1000, "freq-watch")
    const rendering = () => {
        renderer.render(universe)
        freqMeter.tick()
    }

    animate(rendering)
    const pauseResumeAction = animate(() => engine.move(universe))
    return pauseResumeAction
}

function animate(frame: (time: number) => void): () => void {
    const paused = [false]
    const callBack: FrameRequestCallback = time => {
        frame(time)
        if (!paused[0]) {
            requestAnimationFrame(callBack)
        }
    }
    requestAnimationFrame(callBack)
    return () => {
        paused[0] = !paused[0]
        if (!paused[0]) {
            requestAnimationFrame(callBack)
        }
    }
}

function recreate(universe: Universe, universeRadius = 12) {
    const [bodyDescriptions, initialState] = createUniverse(universe.bodiesCount, universeRadius)
    universe.bodyDescriptions = bodyDescriptions
    universe.state = initialState
}

function createUniverse(bodiesCount: number, universeRadius = 12): [BodyDescriptionStruct[], BodyStateStruct[]] {
    const descriptions: BodyDescriptionStruct[] = []
    const initialState: BodyStateStruct[] = []

    for (let i = 0; i < bodiesCount; i++) {
        const mass = skewDown(Math.random(), 16) * 0.999 + 0.001
        const radius = mass ** (1 / 3)
        const p = randomVector(universeRadius) 
        const v = randomVector(0.001 / mass)
        descriptions.push({ mass : 100 * mass, radius })
        initialState.push({ position : p, velocity: v })
    }

    return [descriptions, initialState]
}

function randomVector(radius: number): [number, number, number] {
    const cosYA = 1 - 2 * Math.random()
    const sinYA = Math.sqrt(1 - cosYA * cosYA)
    const xa = 2 * Math.PI * Math.random()
    const r = radius * skewUp(Math.random(), 100)
    const ry = r * sinYA
    const x = ry * Math.cos(xa)
    const y = r * (cosYA)
    const z = ry * Math.sin(xa)
    return [x, y, z]
}

function skewUp(x: number, s: number): number {
    return skewDown(x, 1 / s)
}

function skewDown(x: number, s: number): number {
    return x ** s
}
async function gpuDevice() {
    const gpuStatus = misc.required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}
