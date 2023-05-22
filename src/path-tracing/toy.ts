import * as gpu from "../djee/gpu/index.js"
import { aether, gear } from "../libs.js"
import { RotationDragging } from "../utils/dragging.js"
import { Stacker } from "./stacker.js"
import { Tracer, VolumeStruct } from "./tracer.js"
import { Scene, volume } from "./scene.js"
import { buildScene } from "./scene-builder.js"
import { Denoiser } from "./denoiser.js"

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/path-tracing"
export const video = "https://youtu.be/xlMvArfR2do"
export const huds = {
    "monitor": "monitor-button"
}

export async function init() {
    const loop = await Toy.loop();
    loop.run()
}

type ToyDescriptor = typeof Toy.descriptor

class Toy implements gear.loops.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        input: {
            pointers: {
                canvas: {
                    element: "canvas",
                }
            },
            keys: {
                forward: {
                    physicalKeys: [["KeyW"], ["ArrowUp"]],
                    virtualKeys: "#control-forward",
                }, 
                backward: {
                    physicalKeys: [["KeyS"], ["ArrowDown"]],
                    virtualKeys: "#control-backward",
                }, 
                right: {
                    physicalKeys: [["KeyD"], ["ArrowRight"]],
                    virtualKeys: "#control-right",
                }, 
                left: {
                    physicalKeys: [["KeyA"], ["ArrowLeft"]],
                    virtualKeys: "#control-left",
                }, 
                up: {
                    physicalKeys: [["KeyE"], ["PageUp"]],
                    virtualKeys: "#control-up",
                }, 
                down: {
                    physicalKeys: [["KeyC"], ["PageDown"]],
                    virtualKeys: "#control-down",
                }, 
                layering: {
                    physicalKeys: [["KeyL"]],
                    virtualKeys: "#control-layering",
                }, 
                denoising: {
                    physicalKeys: [["KeyN"]],
                    virtualKeys: "#control-denoising",
                }, 
                recording: {
                    physicalKeys: [["KeyR"]],
                    virtualKeys: "#control-recording",
                }, 
                incSPP: {
                    physicalKeys: [["BracketRight"]],
                    virtualKeys: "#control-inc-spp",
                }, 
                decSPP: {
                    physicalKeys: [["BracketLeft"]],
                    virtualKeys: "#control-dec-spp",
                }, 
                incLayers: {
                    physicalKeys: [["AltRight", "BracketRight"], ["AltLeft", "BracketRight"]],
                    virtualKeys: "#control-inc-layers",
                }, 
                decLayers: {
                    physicalKeys: [["AltRight", "BracketLeft"], ["AltLeft", "BracketLeft"]],
                    virtualKeys: "#control-dec-layers",
                },
            }
        },
        output: {
            canvases: {
                scene: {
                    element: "canvas"
                }
            },
            fps: {
                element: "freq-watch",
                periodInMilliseconds: 1000
            },
            styling: {
                pressedButton: "pressed"
            },
        },
    } satisfies gear.loops.LoopDescriptor

    private _minLayersOnly = false
    private _denoising = true  
    private _minLayersCount = 4

    private wasAnimating = false
    private animating = false
    private changingView = false
    private speeds = [[0, 0], [0, 0], [0, 0]]

    private readonly samplesPerPixelElement = gear.required(document.getElementById("spp"))
    private readonly layersCountElement = gear.required(document.getElementById("layers"))
    private readonly maxLayersCountElement = gear.required(document.getElementById("max-layers"))
    private readonly denoisingElement = gear.required(document.getElementById("denoising"))

    constructor(readonly canvas: gpu.Canvas, private tracer: Tracer, private denoiser: Denoiser, private stacker: Stacker, private scene: Scene) {
        this.samplesPerPixel = Number.parseInt(gear.required(this.samplesPerPixelElement.textContent))
        this.layersCount = Number.parseInt(gear.required(this.samplesPerPixelElement.textContent))
        this.minLayersOnly = gear.required(this.maxLayersCountElement.textContent) != "256"
        this.denoising = gear.required(this.denoisingElement.textContent).toLowerCase() == "on"
        tracer.position = [36, 36, 36]
    }

    static async loop(): Promise<gear.loops.Loop> {
        const scene = buildScene()
        const device = await gpuDevice()
        const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element)
        const tracer = await Tracer.create(device, canvas, scene, canvas.format, "rgba32float")
        const denoiser = await Denoiser.create(device, canvas.size, canvas.format, "rgba32float", canvas.format)
        const stacker = await Stacker.create(device, canvas.size, tracer.uniformsBuffer, denoiser.normalsTexture, canvas.format, canvas.format)
        return gear.loops.newLoop(new Toy(canvas, tracer, denoiser, stacker, scene), Toy.descriptor)
    }

    inputWiring(_: gear.loops.LoopInputs<ToyDescriptor>, outputs: gear.loops.LoopOutputs<ToyDescriptor>): gear.loops.LoopInputWiring<ToyDescriptor> {
        return {
            pointers: {
                canvas: {
                    defaultDraggingTarget: gear.loops.draggingTarget(gear.property(this, "viewMatrix"), RotationDragging.dragger(() => aether.mat4.projection(1, Math.SQRT2)))
                }
            },
            keys: {
                forward: {
                    onPressed: () => this.speeds[2][0] = 0.2,
                    onReleased: () => this.speeds[2][0] = 0.0,
                }, 
                backward: {
                    onPressed: () => this.speeds[2][1] = 0.2,
                    onReleased: () => this.speeds[2][1] = 0.0,
                }, 
                right: {
                    onPressed: () => this.speeds[0][0] = 0.2,
                    onReleased: () => this.speeds[0][0] = 0.0,
                }, 
                left: {
                    onPressed: () => this.speeds[0][1] = 0.2,
                    onReleased: () => this.speeds[0][1] = 0.0,
                }, 
                up: {
                    onPressed: () => this.speeds[1][0] = 0.2,
                    onReleased: () => this.speeds[1][0] = 0.0,
                }, 
                down: {
                    onPressed: () => this.speeds[1][1] = 0.2,
                    onReleased: () => this.speeds[1][1] = 0.0,
                }, 
                layering: {
                    onPressed: () => this.minLayersOnly = !this.minLayersOnly 
                }, 
                denoising: {
                    onPressed: () => this.denoising = !this.denoising
                }, 
                recording: {
                    onPressed: () => outputs.canvases.scene.recorder.startStop()
                }, 
                incSPP: {
                    onPressed: () => this.samplesPerPixel++
                },
                decSPP: {
                    onPressed: () => this.samplesPerPixel--
                }, 
                incLayers: {
                    onPressed: () => this.minLayersCount++
                },
                decLayers: {
                    onPressed: () => this.minLayersCount--
                },
            }
        }
    }

    outputWiring(): gear.loops.LoopOutputWiring<ToyDescriptor> {
        return {
            onRender: () => this.render(),
        }
    }

    animate(): void {
        let v: aether.Vec3 = [
            this.speeds[0][0] - this.speeds[0][1],
            this.speeds[1][0] - this.speeds[1][1],
            this.speeds[2][1] - this.speeds[2][0],
        ]
        const velocity = aether.vec3.prod(v, this.tracer.matrix)
        const speed = aether.vec3.length(velocity)
        this.wasAnimating = this.animating
        this.animating = this.minLayersOnly || this.changingView || speed !== 0
        this.changingView = false
        if (speed > 0) {
            this.tracer.position = move(this.tracer.position, velocity, this.scene)
        }
    }

    render() {
        const device = this.canvas.device
        const clearColor = { r: 0, g: 0, b: 0, a: 1 }
        this.layersCount =
            this.animating 
                ? this._minLayersCount 
                : this.wasAnimating 
                    ? 1 
                    : this.stacker.layersCount + 1
        device.enqueueCommand("render", encoder => {
            const [colorsAttachment, normalsAttachment] = this.denoiser.attachments(clearColor, clearColor)
            if (this.stacker.layersCount > 64 || !this._denoising) {
                this.tracer.render(encoder, this.stacker.colorAttachment(clearColor), normalsAttachment)
            } else {
                this.tracer.render(encoder, colorsAttachment, normalsAttachment)
                this.denoiser.render(encoder, this.stacker.colorAttachment(clearColor))
            }
            if (this.stacker.layersCount >= this._minLayersCount) {
                this.stacker.render(encoder, this.canvas.attachment(clearColor))
            }
        })
    }
    
    get viewMatrix() {
        return aether.mat4.cast(this.tracer.matrix)
    }

    set viewMatrix(m: aether.Mat4) {
        this.changingView = true
        this.tracer.matrix = aether.mat3.from([
            ...aether.vec3.from(m[0]),
            ...aether.vec3.from(m[1]),
            ...aether.vec3.from(m[2]),
        ])
    }

    get samplesPerPixel() {
        return this.tracer.samplesPerPixel
    }
    
    set samplesPerPixel(spp: number) {
        this.tracer.samplesPerPixel = Math.min(Math.max(1, spp), 8)
        this.samplesPerPixelElement.innerText = this.tracer.samplesPerPixel.toString()
    }

    set layersCount(c: number) {
        this.stacker.layersCount = c
        this.layersCountElement.innerText = this.stacker.layersCount.toString()
    }

    get minLayersOnly() {
        return this._minLayersOnly
    }

    set minLayersOnly(b: boolean) {
        this._minLayersOnly = b
        this.maxLayersCountElement.innerText = b ? this._minLayersCount.toString() : "256"
    }

    get minLayersCount() {
        return this._minLayersCount
    }

    set minLayersCount(c: number) {
        this._minLayersCount = Math.min(Math.max(1, c), 8)
        this.minLayersOnly = this.minLayersOnly
    }

    get denoising() {
        return this._denoising
    }

    set denoising(b: boolean) {
        this._denoising = b
        this.denoisingElement.innerText = b ? "on" : "off"
    }

}

function move(position: aether.Vec3, velocity: aether.Vec3, scene: Scene) {
    let safeV = safeVelocity(position, velocity, scene)
    let power = aether.vec3.lengthSquared(safeV) 
    if (power == 0) {
        for (let c = 1; c < 7; c++) {
            const x = c & 1
            const y = (c >> 1) & 1
            const z = (c >> 2) & 1
            const v = safeVelocity(position, aether.vec3.mul(velocity, [x, y, z]), scene)
            const p = aether.vec3.lengthSquared(v)
            if (p > power) {
                safeV = v
                power = p
            }
        }
    }
    return aether.vec3.add(position, safeV)
}

function safeVelocity(position: aether.Vec3, velocity: aether.Vec3, scene: Scene) {
    const currentVolume = volumeAround(position)
    const nextPosition = aether.vec3.add(position, velocity)
    const nextVolume = volumeAround(nextPosition)
    const boxes = scene.volumeBoxes(nextVolume)
    const shortestTimeDistance = boxes
        .filter(b => intersect(b.volume, nextVolume))
        .map(box => timeDistance(currentVolume, box.volume, velocity))
        .reduce((d1, d2) => Math.min(d1, d2), 1)
    return aether.vec3.scale(velocity, shortestTimeDistance)
}

function intersect(v1: VolumeStruct, v2: VolumeStruct): boolean {
    return aether.vec3.sub(
        aether.vec3.min(v1.max, v2.max), 
        aether.vec3.max(v1.min, v2.min)
    ).every(c => c > 0)
}

function volumeAround(position: aether.Vec3) {
    return volume(
        aether.vec3.sub(position, [0.5, 0.5, 0.5]),
        aether.vec3.add(position, [0.5, 0.5, 0.5])
    )
}

function timeDistance(v1: VolumeStruct, v2: VolumeStruct, velocity: aether.Vec3): number {
    const gap: aether.Vec3 = [
        velocity[0] >= 0 ? v2.min[0] - v1.max[0] : v2.max[0] - v1.min[0], 
        velocity[1] >= 0 ? v2.min[1] - v1.max[1] : v2.max[1] - v1.min[1], 
        velocity[2] >= 0 ? v2.min[2] - v1.max[2] : v2.max[2] - v1.min[2], 
    ]
    const distances = aether.vec3.div(gap, velocity).map(c => !Number.isNaN(c) && c >= 0 ? c : 1)
    return Math.min(...distances)
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