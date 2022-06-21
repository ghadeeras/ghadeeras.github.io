import * as aether from '/aether/latest/index.js'
import { BoxStruct, Cell, VolumeStruct } from "./tracer"

export const NULL = 0xFFFFFFFF

export class Scene {

    readonly grid = this.createGrid()
    readonly boxes: BoxStruct[] = []

    readonly materials: aether.Vec4[] = []

    constructor(readonly gridSize: number) {
    }

    private createGrid(): Cell[] {
        const grid = new Array<Cell>(this.gridSize ** 3)
        for (let i = 0; i < grid.length; i++) {
            grid[i] = [
                NULL, NULL, NULL, NULL, 
                NULL, NULL, NULL, NULL
            ]
        }
        return grid
    }

    cellBoxes(x: number, y: number, z: number): BoxStruct[] {
        const cell = this.cell(x, y, z)
        const i = cell.indexOf(NULL)
        return cell
            .slice(0, i >= 0 ? i : undefined)
            .map(b => this.boxes[b])
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
        const j = cell.indexOf(NULL)
        if (j >= 0) {
            cell[j] = box
        }
    }

    private cell(x: number, y: number, z: number): Cell {
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
