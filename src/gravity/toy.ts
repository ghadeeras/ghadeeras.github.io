import * as gear from '../../gear/latest/index.js'
import * as ether from '../../ether/latest/index.js'
import * as dragging from '../utils/dragging.js'
import * as gputils from '../djee/gpu/utils.js'
import { Canvas } from '../djee/gpu/canvas.js'
import { newUniverse, Universe } from './universe.js'
import { newRenderer, Renderer } from './renderer.js'

export function init() {
    window.onload = doInit
}

async function doInit() {
    const [device, adapter] = await gpuObjects()

    const canvas = new Canvas("canvas-gl", device, adapter)
    
    const universe = await newUniverse(device)
    const renderer = await newRenderer(device, canvas)

    const pauseResumeAction = animation(canvas, universe, renderer)
    setupControls(canvas, universe, renderer)
    setupActions(universe, renderer, pauseResumeAction)
}

function setupControls(canvas: Canvas, universe: Universe, renderer: Renderer) {
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
            () => renderer.projectionViewMatrix,
            24
        )))
        .later()
        .attach(m => renderer.modelMatrix = m)

    observerPosition
        .then(gear.drag(new dragging.LinearDragging(() => renderer.viewMatrix[3][2], -64, -1, 16)))
        .map(z => ether.mat4.lookAt([0, 0, z]))
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
        .map(z => ether.mat4.projection(z))
        .later()
        .attach(m => renderer.projectionMatrix = m)
}

function setupActions(universe: Universe, renderer: Renderer, pauseResumeAction: () => void) {
    action("pause").onclick = pauseResumeAction
    action("reset").onclick = () => {
        renderer.modelMatrix = ether.mat4.identity()
        renderer.viewMatrix = ether.mat4.lookAt([0, 0, -24])
        renderer.projectionMatrix = ether.mat4.projection()
        renderer.radiusScale = 0.05
    }
    action("collapse").onclick = () => {
        universe.bodyPointedness = 0.1
        universe.gravityConstant = 1000
        universe.recreateUniverse()
    }
    action("kaboom").onclick = () => {
        universe.bodyPointedness = 10
        universe.gravityConstant = 100
        universe.recreateUniverse(1)
    }
}

function control(previous: string) {
    return gputils.required(document.getElementById(`control-${previous}`))
}

function action(previous: string) {
    return gputils.required(document.getElementById(`action-${previous}`))
}

function animation(canvas: Canvas, universe: Universe, renderer: Renderer) {
    const depthTexture = canvas.depthTexture()
    const rendering = throttled(60, () => {
        renderer.render(universe, {
            colorAttachments: [canvas.attachment({ r: 1, g: 1, b: 1, a: 1 })],
            depthStencilAttachment: gputils.depthAttachment(depthTexture)
        })
    })

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

async function gpuObjects() {
    const gpuStatus = gputils.required(document.getElementById("gpu-status"))
    try {
        const objects = await gputils.gpuObjects()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return objects    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}
