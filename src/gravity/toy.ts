import { aether } from '/gen/libs.js'
import * as gear from '../utils/gear.js'
import * as dragging from '../utils/dragging.js'
import * as gpu from '../djee/gpu/index.js'
import { BodyDescriptionStruct, BodyStateStruct, Universe, UniverseLayout } from './universe.js'
import { newRenderer, Renderer } from './renderer.js'
import { Engine, EngineLayout, newEngine } from './physics.js'
import { Visuals, VisualsLayout } from './visuals.js'

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gravity"
export const video = "https://youtu.be/BrZm6LlOQlI"
export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const toy = await GravityToy.create()

    const loop = gear.newLoop(toy, {
        input: {
            pointer: {
                element: toy.element,
                defaultDraggingTarget: toy.defaultDraggingTarget
            },
            keys: [
                { 
                    virtualKey: "#control-r",
                    alternatives: [["KeyR"]],
                    onPressed: toy.rotationKey
                },
                { 
                    virtualKey: "#control-p",
                    alternatives: [["KeyP"]],
                    onPressed: toy.positionKey
                },
                { 
                    virtualKey: "#control-z",
                    alternatives: [["KeyZ"]],
                    onPressed: toy.zoomKey 
                },
                { 
                    virtualKey: "#control-s",
                    alternatives: [["KeyS"]] ,
                    onPressed: toy.radiusScaleKey
                },
                { 
                    virtualKey: "#control-g",
                    alternatives: [["KeyG"]],
                    onPressed: toy.gravityKey 
                },
                { 
                    virtualKey: "#control-b",
                    alternatives: [["KeyB"]],
                    onPressed: toy.pointednessKey 
                },
                { 
                    virtualKey: "#control-1",
                    alternatives: [["Digit1"]],
                    onPressed: toy.collapseKey 
                },
                { 
                    virtualKey: "#control-2",
                    alternatives: [["Digit2"]],
                    onPressed: toy.kaboomKey 
                },
                { 
                    virtualKey: "#control-3",
                    alternatives: [["Digit3"]],
                    onPressed: toy.resetKey 
                },
                { 
                    virtualKey: "#control-4",
                    alternatives: [["Digit4"]],
                    onPressed: toy.pauseResumeKey 
                },
            ],
        },
        styling: {
            pressedButton: "pressed"
        },
        fps: {
            element: "freq-watch"
        }
    })
    loop.run()

}

class GravityToy implements gear.LoopLogic {

    private gravityDragging = this.draggingTarget("gravity", dragging.RatioDragging.dragger(1, 10000))
    private pointednessDragging = this.draggingTarget("pointedness", dragging.RatioDragging.dragger(0.001, 1000))
    private radiusScaleDragging = this.draggingTarget("radiusScale", dragging.RatioDragging.dragger(0.001, 1))
    private positionDragging = this.draggingTarget("position", dragging.LinearDragging.dragger(-64, -1, 16))
    private zoomDragging = this.draggingTarget("zoom", dragging.RatioDragging.dragger(0.01, 100))
    private rotationDragging = this.draggingTarget("modelMatrix", dragging.RotationDragging.dragger(() => this.visuals.projectionViewMatrix))

    private constructor(private gpuCanvas: gpu.Canvas, private universe: Universe, private visuals: Visuals, private engine: Engine, private renderer: Renderer) {    
    }

    get defaultDraggingTarget() {
        return this.rotationDragging
    }

    get element() {
        return this.gpuCanvas.element
    }

    get gravity() { return this.universe.gravityConstant }
    set gravity(g: number) { this.universe.gravityConstant = g }

    get pointedness() { return this.universe.bodyPointedness }
    set pointedness(p: number) { this.universe.bodyPointedness = p }

    get radiusScale() { return this.visuals.radiusScale }
    set radiusScale(s: number) { this.visuals.radiusScale = s }

    get position() { return this.visuals.viewMatrix[3][2] }
    set position(z: number) { this.visuals.viewMatrix = aether.mat4.lookAt([0, 0, z]) }

    get zoom() { return this.visuals.zoom }
    set zoom(z: number) { this.visuals.zoom = z }
    
    get modelMatrix() { return this.visuals.modelMatrix }
    set modelMatrix(m: aether.Mat4) { this.visuals.modelMatrix = m }

    gravityKey(loop: gear.Loop) { loop.draggingTarget = this.gravityDragging }
    pointednessKey(loop: gear.Loop) { loop.draggingTarget = this.pointednessDragging }
    radiusScaleKey(loop: gear.Loop) { loop.draggingTarget = this.radiusScaleDragging }
    positionKey(loop: gear.Loop) { loop.draggingTarget = this.positionDragging }
    zoomKey(loop: gear.Loop) { loop.draggingTarget = this.zoomDragging }
    rotationKey(loop: gear.Loop) { loop.draggingTarget = this.rotationDragging }
    collapseKey() { recreateCollapse(this.universe) }
    kaboomKey() { recreateKaboom(this.universe) }
    resetKey() { resetRendering(this.visuals, this.renderer) }
    pauseResumeKey(loop: gear.Loop) { loop.animationPaused = !loop.animationPaused }

    animate() { this.engine.move(this.universe) }
    render() { this.renderer.render(this.universe) }

    private draggingTarget<K extends keyof this>(key: K, dragger: gear.Dragger<this[K]>): gear.DraggingTarget {
        return gear.draggingTarget(gear.property(this, key), dragger)
    }
    
    static async create(): Promise<GravityToy> {
        const device = await gpuDevice()
        const canvas = device.canvas("canvas", 4)
        const universeLayout = new UniverseLayout(device)
        const universe = universeLayout.instance(...createUniverse(16384))
        const visualsLayout = new VisualsLayout(device)
        const visuals = visualsLayout.instance()
        const engineLayout = new EngineLayout(universeLayout)
        const engine = await newEngine(engineLayout)
        const renderer = await newRenderer(device, canvas, visuals)
        return new GravityToy(canvas, universe, visuals, engine, renderer)
    }

}

function resetRendering(visuals: Visuals, renderer: Renderer) {
    visuals.modelMatrix = aether.mat4.identity()
    visuals.viewMatrix = aether.mat4.lookAt([0, 0, -24])
    visuals.radiusScale = 0.06
    visuals.zoom = 1
    renderer.resize()
}

function recreateKaboom(universe: Universe) {
    universe.bodyPointedness = 5
    universe.gravityConstant = 25
    recreate(universe, 1)
}

function recreateCollapse(universe: Universe) {
    universe.bodyPointedness = 0.1
    universe.gravityConstant = 1000
    recreate(universe)
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
