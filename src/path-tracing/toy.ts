import * as gpu from "../djee/gpu/index.js"
import * as aether from "/aether/latest/index.js"
import * as gearx from "../utils/gear.js"
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

class Toy implements gearx.LoopLogic<ToyDescriptor> {

    static readonly descriptor = {
        fps: {
            element: "freq-watch",
            periodInMilliseconds: 1000
        },
        styling: {
            pressedButton: "pressed"
        },
        input: {
            pointers: {
                canvas: {
                    element: "canvas",
                }
            },
            keys: {
                forward: {
                    alternatives: [["KeyW"], ["ArrowUp"]],
                    virtualKey: "#control-forward",
                }, 
                backward: {
                    alternatives: [["KeyS"], ["ArrowDown"]],
                    virtualKey: "#control-backward",
                }, 
                right: {
                    alternatives: [["KeyD"], ["ArrowRight"]],
                    virtualKey: "#control-right",
                }, 
                left: {
                    alternatives: [["KeyA"], ["ArrowLeft"]],
                    virtualKey: "#control-left",
                }, 
                up: {
                    alternatives: [["KeyE"], ["PageUp"]],
                    virtualKey: "#control-up",
                }, 
                down: {
                    alternatives: [["KeyC"], ["PageDown"]],
                    virtualKey: "#control-down",
                }, 
                layering: {
                    alternatives: [["KeyL"]],
                    virtualKey: "#control-layering",
                }, 
                denoising: {
                    alternatives: [["KeyN"]],
                    virtualKey: "#control-denoising",
                }, 
                recording: {
                    alternatives: [["KeyR"]],
                    virtualKey: "#control-recording",
                }, 
                incSPP: {
                    alternatives: [["BracketRight"]],
                    virtualKey: "#control-inc-spp",
                }, 
                decSPP: {
                    alternatives: [["BracketLeft"]],
                    virtualKey: "#control-dec-spp",
                }, 
                incLayers: {
                    alternatives: [["AltRight", "BracketRight"], ["AltLeft", "BracketRight"]],
                    virtualKey: "#control-inc-layers",
                }, 
                decLayers: {
                    alternatives: [["AltRight", "BracketLeft"], ["AltLeft", "BracketLeft"]],
                    virtualKey: "#control-dec-layers",
                },
            }
        }
    } satisfies gearx.LoopDescriptor

    private _minLayersOnly = false
    private _denoising = true  
    private _minLayersCount = 4

    private wasAnimating = false
    private animating = false
    private changingView = false
    private speed = aether.vec3.of(0, 0, 0)

    private readonly samplesPerPixelElement = gearx.required(document.getElementById("spp"))
    private readonly layersCountElement = gearx.required(document.getElementById("layers"))
    private readonly maxLayersCountElement = gearx.required(document.getElementById("max-layers"))
    private readonly denoisingElement = gearx.required(document.getElementById("denoising"))

    constructor(readonly canvas: gpu.Canvas, private tracer: Tracer, private denoiser: Denoiser, private stacker: Stacker, private recorder: gearx.CanvasRecorder, private scene: Scene) {
        this.samplesPerPixel = Number.parseInt(gearx.required(this.samplesPerPixelElement.textContent))
        this.layersCount = Number.parseInt(gearx.required(this.samplesPerPixelElement.textContent))
        this.minLayersOnly = gearx.required(this.maxLayersCountElement.textContent) != "256"
        this.denoising = gearx.required(this.denoisingElement.textContent).toLowerCase() == "on"
        tracer.position = [36, 36, 36]
    }

    static async loop(): Promise<gearx.Loop<ToyDescriptor>> {
        const scene = buildScene()
        const device = await gpuDevice()
        const canvas = device.canvas("canvas")
        const recorder = new gearx.CanvasRecorder(canvas.element)
        const tracer = await Tracer.create(device, canvas, scene, canvas.format, "rgba32float")
        const denoiser = await Denoiser.create(device, canvas.size, canvas.format, "rgba32float", canvas.format)
        const stacker = await Stacker.create(device, canvas.size, tracer.uniformsBuffer, denoiser.normalsTexture, canvas.format, canvas.format)
        return gearx.newLoop(new Toy(canvas, tracer, denoiser, stacker, recorder, scene), Toy.descriptor)
    }

    wiring(): gearx.LoopWiring<ToyDescriptor> {
        return {
            pointers: {
                canvas: {
                    defaultDraggingTarget: gearx.draggingTarget(gearx.property(this, "viewMatrix"), RotationDragging.dragger(() => aether.mat4.projection(1, Math.SQRT2)))
                }
            },
            keys: {
                forward: {
                    onPressed: () => this.setSpeed(2, -0.2),
                    onReleased: () => this.setSpeed(2, 0),
                }, 
                backward: {
                    onPressed: () => this.setSpeed(2, 0.2),
                    onReleased: () => this.setSpeed(2, 0),
                }, 
                right: {
                    onPressed: () => this.setSpeed(0, 0.2),
                    onReleased: () => this.setSpeed(0, 0),
                }, 
                left: {
                    onPressed: () => this.setSpeed(0, -0.2),
                    onReleased: () => this.setSpeed(0, 0),
                }, 
                up: {
                    onPressed: () => this.setSpeed(1, 0.2),
                    onReleased: () => this.setSpeed(1, 0),
                }, 
                down: {
                    onPressed: () => this.setSpeed(1, -0.2),
                    onReleased: () => this.setSpeed(1, 0),
                }, 
                layering: {
                    onPressed: () => this.minLayersOnly = !this.minLayersOnly 
                }, 
                denoising: {
                    onPressed: () => this.denoising = !this.denoising
                }, 
                recording: {
                    onPressed: () => this.toggleRecording()
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

    animate(): void {
        const velocity = aether.vec3.prod(this.speed, this.tracer.matrix)
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
        this.recorder.requestFrame()
    }
    
    get viewMatrix() {
        return aether.mat4.cast(this.tracer.matrix)
    }

    set viewMatrix(m: aether.Mat4) {
        this.changingView = true
        this.tracer.matrix = aether.mat3.from([
            ...aether.vec3.swizzle(m[0], 0, 1, 2),
            ...aether.vec3.swizzle(m[1], 0, 1, 2),
            ...aether.vec3.swizzle(m[2], 0, 1, 2),
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

    setSpeed(axis: number, speed: number) {
        this.speed[axis] = speed
    }

    toggleRecording() {
        this.recorder.startStop()
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
    const gpuStatus = gearx.required(document.getElementById("gpu-status"))
    try {
        const device = await gpu.Device.instance()
        gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}"
        return device    
    } catch (e) {
        gpuStatus.innerHTML = "\u{1F62D} Not Supported!"
        throw e
    }
}