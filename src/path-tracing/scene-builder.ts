import * as aether from '/aether/latest/index.js'
import { Scene, volume } from "./scene.js"
import { VolumeStruct } from './tracer.js'

export function buildScene(): Scene {
    const scene = new Scene(64)
    setup(scene)
    return scene
}

function setup(scene: Scene) {
    scene.material([0.6, 0.9, 0.3,  1.0])
    scene.material([0.3, 0.6, 0.9,  1.0])
    scene.material([0.9, 0.3, 0.6,  1.0])
    scene.material([0.6, 0.6, 0.6,  1.0])
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
        aether.vec3.max(aether.vec3.add(pos, v.min), [1, 1, 1]), 
        aether.vec3.min(aether.vec3.add(pos, v.max), [63, 63, 63]), 
        i != 2 ? materials : luminousMaterials
    ))
}