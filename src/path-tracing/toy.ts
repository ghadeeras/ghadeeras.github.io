import * as gpu from "../djee/gpu/index.js"
import * as aether from "/aether/latest/index.js"
import * as gear from "/gear/latest/index.js"
import * as misc from "../utils/misc.js"
import { RotationDragging } from "../utils/dragging.js"
import { Stacker } from "./stacker.js"
import { BoxStruct, Tracer, VolumeStruct } from "./tracer.js"
import { Scene, volume } from "./scene.js"

export function init() {
    window.onload = doInit
}

async function doInit() {
    const scene = new Scene(64)
    setup(scene)

    const device = await gpuDevice()
    const canvas = device.canvas("canvas", false)

    const tracer = await Tracer.create(device, canvas, scene)
    const stacker = await Stacker.create(device, canvas.size, canvas.format)

    const state = {
        wasAnimating: false,
        animating: false,
        speed: 0
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

    setSamplesPerPixel(4)
    setLayersCount(4)

    const handleKey = (e: KeyboardEvent, down: boolean) => {
        let s = down ? 0.2 : 0
        if (e.key == 'w') {
            state.speed = -s
            e.preventDefault()
        }
        if (e.key == 's') {
            state.speed = s
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
        const animating = state.speed !== 0 || state.animating
        setLayersCount(animating ? 2 : state.wasAnimating ? 1 : stacker.layersCount + 1)
        // setSamplesPerPixel(Math.max(4, stacker.layersCount))
        state.wasAnimating = animating
        state.animating = false;
        device.enqueueCommand(encoder => {
            tracer.encode(encoder, stacker.colorAttachment(clearColor))
            if (stacker.layersCount >= 2) {
                stacker.render(encoder, canvas.attachment(clearColor))
            }
        })
        if (state.speed === 0) {
            return
        }
        const [u, v, w] = aether.mat3.transpose(tracer.matrix)
        let velocity = aether.vec3.scale(w, state.speed)
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

function setup(scene: Scene) {
    scene.material([0.6, 0.9, 0.3,  1.0])
    scene.material([0.3, 0.6, 0.9,  1.0])
    scene.material([0.9, 0.3, 0.6,  1.0])
    scene.material([0.5, 0.5, 0.5,  1.0])
    scene.material([2.0, 2.0, 2.0, -1.0])
    populateGrid(scene)
}

function populateGrid(scene: Scene) {
    const materials = [3, 3, 3, 3, 3, 3]
    bigBox(scene, [ 0,  0,  0], [64, 64,  1], materials)
    bigBox(scene, [ 0,  0,  0], [64,  1, 64], materials)
    bigBox(scene, [ 0,  0,  0], [ 1, 64, 64], materials)
    bigBox(scene, [ 0,  0, 63], [64, 64, 64], materials)
    bigBox(scene, [ 0, 63,  0], [64, 64, 64], materials)
    bigBox(scene, [63,  0,  0], [64, 64, 64], materials)
    for (let x = 0; x < scene.gridSize; x += 8) {
        for (let y = 0; y < scene.gridSize; y += 8) {
            for (let z = 0; z < scene.gridSize; z += 8) {
                const luminousOrientation = ((x + y + z) / 8) % 3
                for (let orientation = 0; orientation < 3; orientation++) {
                    addWall(scene, [x, y, z], orientation, luminousOrientation)
                }
            }
        }
    }
}

function bigBox(scene: Scene, min: aether.Vec3, max: aether.Vec3, materials: number[]) {
    const size = aether.vec3.sub(max, min)
    if (size.some(c => c > 4)) {
        const cx = size[0] > 4 ? Math.ceil(size[0] / 4) : 1
        const cy = size[1] > 4 ? Math.ceil(size[1] / 4) : 1
        const cz = size[2] > 4 ? Math.ceil(size[2] / 4) : 1
        const s = aether.vec3.div(size, [cx, cy, cz])
        for (let i = 0; i < cx; i++) {
            const x1 = Math.floor(min[0] + i * s[0]) 
            const x2 = Math.ceil(min[0] + (i + 1) * s[0]) 
            for (let j = 0; j < cy; j++) {
                const y1 = Math.floor(min[1] + j * s[1]) 
                const y2 = Math.ceil(min[1] + (j + 1) * s[1]) 
                for (let k = 0; k < cz; k++) {
                    const z1 = Math.floor(min[2] + k * s[2]) 
                    const z2 = Math.ceil(min[2] + (k + 1) * s[2]) 
                    scene.box([x1, y1, z1], [x2, y2, z2], materials)
                }
            }
        }
    }
}

function addWall(scene: Scene, pos: aether.Vec3, orientation: number, luminousOrientation: number) {
    const config = Math.floor((pos[0] / 8 + pos[1] / 8 + pos[2] / 8) % 3)
    const volumes: VolumeStruct[] = [
        volume([0.0, 0.0, 0.0], [4.0, 4.0, 1.0]),
        volume([4.0, 0.0, 0.0], [8.0, 4.0, 1.0]),
        volume([0.0, 4.0, 0.0], [4.0, 8.0, 1.0]),
    ]
    switch (config) {
        case 1: volumes.forEach(({min, max}) => { 
            const t = max[0]
            max[0] = 8 - min[0] 
            min[0] = 8 - t 
        }); break
        case 2: volumes.forEach(({min, max}) => { 
            const t = max[1]
            max[1] = 8 - min[1] 
            min[1] = 8 - t 
        }); break
    }
    let luminousFace = 3
    switch (orientation) {
        case 1: volumes.forEach(v => {
            v.min = aether.vec3.swizzle(v.min, 1, 2, 0)
            v.max = aether.vec3.swizzle(v.max, 1, 2, 0)
        }); luminousFace = 0; break
        case 2: volumes.forEach(v => {
            v.min = aether.vec3.swizzle(v.min, 2, 0, 1)
            v.max = aether.vec3.swizzle(v.max, 2, 0, 1)
        }); luminousFace = 4; break
    }
    const m = orientation
    const materials = [m, m, m, m, m, m]
    const luminousMaterials = [...materials]
    if (luminousOrientation === orientation) {
        luminousMaterials[luminousFace] = 4
    }
    volumes.forEach((v, i) => scene.box(
        aether.vec3.add(pos, v.min), 
        aether.vec3.add(pos, v.max), 
        i < 2 ? materials : luminousMaterials
    )) 
}