import * as gpu from "../djee/gpu/index.js"
import * as aether from "/aether/latest/index.js"
import * as gear from "/gear/latest/index.js"
import * as misc from "../utils/misc.js"
import { RotationDragging } from "../utils/dragging.js"
import { Stacker } from "./stacker.js"
import { BoxStruct, Tracer } from "./tracer.js"
import { Scene } from "./scene.js"
import { buildScene } from "./scene-builder.js"

export function init() {
    window.onload = doInit
}

async function doInit() {
    const scene = buildScene()

    const device = await gpuDevice()
    const canvas = device.canvas("canvas", false)

    const tracer = await Tracer.create(device, canvas, scene)
    const stacker = await Stacker.create(device, canvas.size, canvas.format)

    const state = {
        wasAnimating: false,
        animating: false,
        speed: aether.vec3.of(0, 0, 0)
    }
    const samplesPerPixelElement = misc.required(document.getElementById("spp"))
    const layersCountElement = misc.required(document.getElementById("layers"))

    const setSamplesPerPixel = (spp: number) => {
        tracer.samplesPerPixel = spp
        samplesPerPixelElement.innerText = tracer.samplesPerPixel.toString()
    }

    const setLayersCount = (c: number) => {
        stacker.layersCount = c
        layersCountElement.innerText = stacker.layersCount.toString()
    }

    setSamplesPerPixel(2)
    setLayersCount(2)

    const handleKey = (e: KeyboardEvent, down: boolean) => {
        const m = aether.mat3.transpose(tracer.matrix)
        const s = down ? 0.2 : 0
        if (e.key == 'w') {
            state.speed = aether.vec3.scale(m[2], -s)
            e.preventDefault()
        } else if (e.key == 's') {
            state.speed = aether.vec3.scale(m[2], s)
            e.preventDefault()
        } else if (e.key == 'd') {
            state.speed = aether.vec3.scale(m[0], s)
            e.preventDefault()
        } else if (e.key == 'a') {
            state.speed = aether.vec3.scale(m[0], -s)
            e.preventDefault()
        } else if (e.key == 'e') {
            state.speed = aether.vec3.scale(m[1], s)
            e.preventDefault()
        } else if (e.key == 'c') {
            state.speed = aether.vec3.scale(m[1], -s)
            e.preventDefault()
        } else if (down && e.key >= '1' && e.key <= '8') {
            setSamplesPerPixel(Number.parseInt(e.key))
            e.preventDefault()
        }
    }
    window.onkeyup = e => handleKey(e, false)
    window.onkeydown = e => handleKey(e, true)

    canvas.element.onwheel = e => {
        state.animating = true
        e.preventDefault()
        tracer.focalRatio *= Math.exp(-Math.sign(e.deltaY) * 0.25)
    }

    gear.ElementEvents.create(canvas.element.id).dragging.value
        .then(gear.drag(new RotationDragging(() => aether.mat4.cast(tracer.matrix), () => aether.mat4.projection(1, Math.SQRT2))))
        .attach(m => {
            state.animating = true
            tracer.matrix = aether.mat3.from([
                ...aether.vec3.swizzle(m[0], 0, 1, 2),
                ...aether.vec3.swizzle(m[1], 0, 1, 2),
                ...aether.vec3.swizzle(m[2], 0, 1, 2),
            ])
        })

    tracer.position = [36, 36, 36]

    const clearColor = { r: 0, g: 0, b: 0, a: 1 }
    const draw = () => {
        const speed = aether.vec3.length(state.speed)
        const animating = speed !== 0 || state.animating
        setLayersCount(animating ? 2 : state.wasAnimating ? 1 : stacker.layersCount + 1)
        state.wasAnimating = animating
        state.animating = false;
        device.enqueueCommand(encoder => {
            tracer.encode(encoder, stacker.colorAttachment(clearColor))
            if (stacker.layersCount >= 2) {
                stacker.render(encoder, canvas.attachment(clearColor))
            }
        })
        if (speed === 0) {
            return
        }
        let velocity = state.speed
        for (let i = 0; i < 3; i++) {
            let [dt, box] = hitDT(tracer.position, velocity, scene)
            if (dt !== 0 || box === null) {
                tracer.position = aether.vec3.add(tracer.position, aether.vec3.scale(velocity, dt))
                break
            }
            velocity = aether.vec3.reject(velocity, normalAt(box, tracer.position))
        }
    }
    
    const freqMeter = misc.FrequencyMeter.create(1000, "freq-watch")
    freqMeter.animateForever(draw)

}

function normalAt(box: BoxStruct, position: aether.Vec3): aether.Vec3 {
    const n = aether.vec3.sub(
        aether.vec3.div(
            aether.vec3.sub(position, box.volume.min), 
            aether.vec3.sub(box.volume.max, box.volume.min)
        ),
        [0.5, 0.5, 0.5]
    )
    const m = Math.max(...n.map(Math.abs))
    const [x, y, z] = n.map(c => Math.trunc(c / m))
    return aether.vec3.unit([x, y, z])
}

function hitDT(position: aether.Vec3, velocity: aether.Vec3, scene: Scene): [number, BoxStruct | null] {
    const [sx, sy, sz] = velocity.map(Math.sign)
    const [x1, y1, z1] = position.map(Math.trunc)
    const [x2, y2, z2] = aether.vec3.add([x1, y1, z1], [sx, sy, sz])
    let result = 1
    let hitBox: BoxStruct | null = null
    const distance = distanceFunction(position, velocity)
    for (let x = x1; sx * x <= sx * x2; x += sx) {
        for (let y = y1; sy * y <= sy * y2; y += sy) {
            for (let z = z1; sz * z <= sz * z2; z += sz) {
                const boxes = scene.cellBoxes(x, y, z)
                for (const box of boxes) {
                    const d = distance(box, result)
                    if (d < result) {
                        result = d
                        hitBox = box
                    }
                }
                if (sz === 0) {
                    break
                }
            }
            if (sy === 0) {
                break
            }
        }
        if (sx === 0) {
            break
        }
    }
    return [result, hitBox]
}

function distanceFunction(position: aether.Vec3, velocity: aether.Vec3): (box: BoxStruct, max: number) => number {
    const p = aether.vec3.add(position, aether.vec3.setLength(velocity, 0.1))
    return (box, max) => {
        const t1 = aether.vec3.div(aether.vec3.sub(box.volume.min, p), velocity)
        const t2 = aether.vec3.div(aether.vec3.sub(box.volume.max, p), velocity)
        const mn = aether.vec3.min(t1, t2).filter(n => !Number.isNaN(n))
        const mx = aether.vec3.max(t1, t2).filter(n => !Number.isNaN(n))
        const d1 = Math.max(0, ...mn)
        const d2 = Math.min(max, ...mx)
        return d1 < d2 ? d1 : max 
    }
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