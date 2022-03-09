import { aether, gear } from '/gen/libs.js'
import * as dragging from '../utils/dragging.js'
import * as gpu from '../djee/gpu/index.js'
import { newUniverse, Universe } from './universe.js'
import { newRenderer, Renderer } from './renderer.js'
import { required } from '../utils/misc.js'

export function init() {
    window.onload = doInit
}

async function doInit() {
    const device = await gpuDevice()

    const canvas = device.canvas("canvas-gl")
    
    const universe = await newUniverse(device)
    const renderer = await newRenderer(device, canvas)

    const pauseResumeAction = animation(universe, renderer)
    setupControls(canvas, universe, renderer)
    setupActions(universe, renderer, pauseResumeAction)
}

function setupControls(canvas: gpu.Canvas, universe: Universe, renderer: Renderer) {
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

    const controller = new gear.Value((c: gear.Consumer<KeyboardEvent>) => window.onkeyup = c)
        .map(e => e.key.toLowerCase())
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
            () => renderer.modelMatrix,
            () => renderer.projectionViewMatrix
        )))
        .later()
        .attach(m => renderer.modelMatrix = m)

    observerPosition
        .then(gear.drag(new dragging.LinearDragging(() => renderer.viewMatrix[3][2], -64, -1, 16)))
        .map(z => aether.mat4.lookAt([0, 0, z]))
        .later()
        .attach(m => renderer.viewMatrix = m)

    bodyPointedness
        .then(gear.drag(new dragging.RatioDragging(() => universe.bodyPointedness, 0.001, 1000)))
        .later()
        .attach(p => universe.bodyPointedness = p)

    gravityConstant
        .then(gear.drag(new dragging.RatioDragging(() => universe.gravityConstant, 1, 10000)))
        .later()
        .attach(g => universe.gravityConstant = g)

    radiusScale
        .then(gear.drag(new dragging.RatioDragging(() => renderer.radiusScale, 0.001, 1)))
        .later()
        .attach(s => renderer.radiusScale = s)

    zoom
        .then(gear.drag(new dragging.RatioDragging(() => renderer.projectionMatrix[0][0], 0.01, 100)))
        .map(z => aether.mat4.projection(z))
        .later()
        .attach(m => renderer.projectionMatrix = m)
}

function setupActions(universe: Universe, renderer: Renderer, pauseResumeAction: () => void) {
    action("pause").onclick = pauseResumeAction
    action("reset").onclick = () => {
        renderer.modelMatrix = aether.mat4.identity()
        renderer.viewMatrix = aether.mat4.lookAt([0, 0, -24])
        renderer.projectionMatrix = aether.mat4.projection()
        renderer.radiusScale = 0.06
    }
    action("collapse").onclick = () => {
        universe.bodyPointedness = 0.1
        universe.gravityConstant = 1000
        universe.recreateUniverse()
    }
    action("kaboom").onclick = () => {
        universe.bodyPointedness = 5
        universe.gravityConstant = 25
        universe.recreateUniverse(1)
    }
}

function control(previous: string) {
    return required(document.getElementById(`control-${previous}`))
}

function action(previous: string) {
    return required(document.getElementById(`action-${previous}`))
}

function animation(universe: Universe, renderer: Renderer) {
    const rendering = throttled(60, () => renderer.render(universe))

    animate(rendering)
    const pauseResumeAction = animate(() => universe.tick())
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

function throttled(freqInHz: number, logic: () => void): (time?: number) => void {
    const periodInMilliseconds = 1000 / freqInHz
    const lastTime = [performance.now()]
    return time => {
        const t = time ?? performance.now()
        const elapsed = t - lastTime[0]
        if (elapsed > periodInMilliseconds) {
            logic()
            lastTime[0] = t - (elapsed % periodInMilliseconds)
        }
    }
}

async function gpuDevice() {
    const gpuStatus = required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}
