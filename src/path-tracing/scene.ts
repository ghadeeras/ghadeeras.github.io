import * as aether from '/aether/latest/index.js'
import { BoxStruct, cellStruct, CellStruct, VolumeStruct } from "./tracer.js"

export const NULL = 0xFFFFFFFF

export class Scene {

    readonly grid = this.createGrid()
    readonly boxes: BoxStruct[] = []

    readonly materials: aether.Vec4[] = []

    constructor(readonly gridSize: number) {
    }

    private createGrid(): CellStruct[] {
        const grid = new Array<CellStruct>(this.gridSize ** 3)
        for (let i = 0; i < grid.length; i++) {
            grid[i] = {
                boxes: [
                    NULL, NULL, NULL, NULL, 
                    NULL, NULL, NULL, NULL
                ],
                size: 0
            }
        }
        return grid
    }

    cellBoxes(x: number, y: number, z: number): BoxStruct[] {
        const cell = this.cell(x, y, z)
        return cell.boxes
            .slice(0, cell.size)
            .map(b => this.boxes[b])
    }

    volumeBoxes(volume: VolumeStruct): BoxStruct[] {
        const result: BoxStruct[] = []
        for (let x = volume.min[0]; x <= volume.max[0]; x++) {
            const i = Math.floor(x)
            for (let y = volume.min[1]; y <= volume.max[1]; y++) {
                const j = Math.floor(y)
                for (let z = volume.min[2]; z <= volume.max[2]; z++) {
                    const k = Math.floor(z)
                    const boxes = this.cellBoxes(i, j, k)
                    for (const box of boxes) {
                        if (result.indexOf(box) < 0) {
                            result.push(box)
                        }
                    }
                }
            }
        }
        return result
    }

    material(m: aether.Vec4) {
        return this.materials.push(m) - 1
    }

    box(min: aether.Vec3, max: aether.Vec3, materials: number[]) {
        const box = {
            volume: volume(min, max),
            faceMaterials: materials,
        }
        const id = this.boxes.push(box) - 1
        this.addBox(box, id)
        return id
    }

    private addBox(box: BoxStruct, id: number) {
        let { min, max } = box.volume
        min = this.toGridCoords(min)
        for (let x = min[0]; x < max[0]; x++) {
            for (let y = min[1]; y < max[1]; y++) {
                for (let z = min[2]; z < max[2]; z++) {
                    this.addBoxToCell(id, x, y, z)
                }
            }
        }
    }

    private toGridCoords(v: aether.Vec3): aether.Vec3 {
        return aether.vec3.min(
            aether.vec3.max(
                [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])],
                [0, 0, 0]
            ), 
            [this.gridSize - 1, this.gridSize - 1, this.gridSize - 1]
        )
    }
    
    private addBoxToCell(box: number, x: number, y: number, z: number) {
        const cell = this.cell(x, y, z)
        if (cell.size < cellStruct.members.boxes.items.length) {
            cell.boxes[cell.size++] = box
        }
    }

    private cell(x: number, y: number, z: number): CellStruct {
        const i = ((x * this.gridSize) + y) * this.gridSize + z
        return this.grid[i]
    }

}

export function volume(min: aether.Vec3, max: aether.Vec3): VolumeStruct {
    return {
        min, max,
        invSize: aether.vec3.div(
            aether.vec3.of(2, 2, 2),
            aether.vec3.sub(max, min)
        )
    }
}
