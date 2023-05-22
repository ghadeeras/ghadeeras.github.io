import { aether, gear } from '/gen/libs.js'
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

type ToyDescriptor = typeof Toy.descriptor

export async function init() {
    const loop = await Toy.loop()
    loop.run()
}

class Toy implements gear.loops.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        input: {
            pointers: {
                canvas: {
                    element: "canvas",
                }
            },
            keys: {
                rotation: {
                    virtualKeys: "#control-r",
                    physicalKeys: [["KeyR"]],
                },
                position: {
                    virtualKeys: "#control-p",
                    physicalKeys: [["KeyP"]],
                },
                zoom: {
                    virtualKeys: "#control-z",
                    physicalKeys: [["KeyZ"]],
                },
                radiusScale: {
                    virtualKeys: "#control-s",
                    physicalKeys: [["KeyS"]],
                },
                gravity: {
                    virtualKeys: "#control-g",
                    physicalKeys: [["KeyG"]],
                },
                pointedness: {
                    virtualKeys: "#control-b",
                    physicalKeys: [["KeyB"]],
                },
                collapse: {
                    virtualKeys: "#control-1",
                    physicalKeys: [["Digit1"]],
                },
                kaboom: {
                    virtualKeys: "#control-2",
                    physicalKeys: [["Digit2"]],
                },
                reset: {
                    virtualKeys: "#control-3",
                    physicalKeys: [["Digit3"]],
                },
                pauseResume: {
                    virtualKeys: "#control-4",
                    physicalKeys: [["Digit4"]],
                },
            },
        },
        output: {
            canvases: {
                scene: {
                    element: "canvas"
                }
            },
            styling: {
                pressedButton: "pressed"
            },
            fps: {
                element: "freq-watch"
            }
        },
    } satisfies gear.loops.LoopDescriptor
    
    private gravityDragging = this.draggingTarget("gravity", dragging.RatioDragging.dragger(1, 10000))
    private pointednessDragging = this.draggingTarget("pointedness", dragging.RatioDragging.dragger(0.001, 1000))
    private radiusScaleDragging = this.draggingTarget("radiusScale", dragging.RatioDragging.dragger(0.001, 1))
    private positionDragging = this.draggingTarget("position", dragging.LinearDragging.dragger(-64, -1, 16))
    private zoomDragging = this.draggingTarget("zoom", dragging.RatioDragging.dragger(0.01, 100))
    private rotationDragging = this.draggingTarget("modelMatrix", dragging.RotationDragging.dragger(() => this.visuals.projectionViewMatrix))

    private constructor(private gpuCanvas: gpu.Canvas, private universe: Universe, private visuals: Visuals, private engine: Engine, private renderer: Renderer) {    
    }

    inputWiring(inputs: gear.loops.LoopInputs<ToyDescriptor>, _: gear.loops.LoopOutputs<ToyDescriptor>, controller: gear.loops.LoopController): gear.loops.LoopInputWiring<ToyDescriptor> {
        return {
            pointers: {
                canvas: {
                    defaultDraggingTarget: this.rotationDragging
                }
            },
            keys: {
                rotation: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.rotationDragging },
                position: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.positionDragging },
                zoom: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.zoomDragging },
                radiusScale: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.radiusScaleDragging },
                gravity: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.gravityDragging },
                pointedness: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.pointednessDragging },
                collapse: { onPressed: () => recreateCollapse(this.universe) },
                kaboom: { onPressed: () => recreateKaboom(this.universe) },
                reset: { onPressed: () => resetRendering(this.visuals, this.renderer) },
                pauseResume: { onPressed: () => controller.animationPaused = !controller.animationPaused },
            },
        }
    }

    outputWiring(): gear.loops.LoopOutputWiring<ToyDescriptor> {
        return {
            onRender: () => this.renderer.render(this.universe),
            canvases: {
                scene: { onResize: () => this.renderer.resize() }
            },
        }
    }

    animate() { this.engine.move(this.universe) }

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

    private draggingTarget<K extends keyof this>(key: K, dragger: gear.loops.Dragger<this[K]>): gear.loops.DraggingTarget {
        return gear.loops.draggingTarget(gear.property(this, key), dragger)
    }
    
    static async loop(): Promise<gear.loops.Loop> {
        const device = await gpuDevice()
        const canvas = device.canvas(Toy.descriptor.input.pointers.canvas.element, 4)
        const universeLayout = new UniverseLayout(device)
        const universe = universeLayout.instance(...createUniverse(16384))
        const visualsLayout = new VisualsLayout(device)
        const visuals = visualsLayout.instance()
        const engineLayout = new EngineLayout(universeLayout)
        const engine = await newEngine(engineLayout)
        const renderer = await newRenderer(device, canvas, visuals)
        return gear.loops.newLoop(new Toy(canvas, universe, visuals, engine, renderer), Toy.descriptor)
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
