import * as aether from '/aether/latest/index.js';
export const NULL = 0xFFFFFFFF;
export class Scene {
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.grid = this.createGrid();
        this.boxes = [];
        this.materials = [];
    }
    createGrid() {
        const grid = new Array(Math.pow(this.gridSize, 3));
        for (let i = 0; i < grid.length; i++) {
            grid[i] = [
                NULL, NULL, NULL, NULL,
                NULL, NULL, NULL, NULL
            ];
        }
        return grid;
    }
    cellBoxes(x, y, z) {
        const cell = this.cell(x, y, z);
        const i = cell.indexOf(NULL);
        return cell
            .slice(0, i >= 0 ? i : undefined)
            .map(b => this.boxes[b]);
    }
    volumeBoxes(volume) {
        const result = [];
        for (let x = volume.min[0]; x <= volume.max[0]; x++) {
            const i = Math.floor(x);
            for (let y = volume.min[1]; y <= volume.max[1]; y++) {
                const j = Math.floor(y);
                for (let z = volume.min[2]; z <= volume.max[2]; z++) {
                    const k = Math.floor(z);
                    const boxes = this.cellBoxes(i, j, k);
                    for (const box of boxes) {
                        if (result.indexOf(box) < 0) {
                            result.push(box);
                        }
                    }
                }
            }
        }
        return result;
    }
    material(m) {
        return this.materials.push(m) - 1;
    }
    box(min, max, materials) {
        const box = {
            volume: volume(min, max),
            faceMaterials: materials,
        };
        const id = this.boxes.push(box) - 1;
        this.addBox(box, id);
        return id;
    }
    addBox(box, id) {
        let { min, max } = box.volume;
        min = this.toGridCoords(min);
        for (let x = min[0]; x < max[0]; x++) {
            for (let y = min[1]; y < max[1]; y++) {
                for (let z = min[2]; z < max[2]; z++) {
                    this.addBoxToCell(id, x, y, z);
                }
            }
        }
    }
    toGridCoords(v) {
        return aether.vec3.min(aether.vec3.max([Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])], [0, 0, 0]), [this.gridSize - 1, this.gridSize - 1, this.gridSize - 1]);
    }
    addBoxToCell(box, x, y, z) {
        const cell = this.cell(x, y, z);
        const j = cell.indexOf(NULL);
        if (j >= 0) {
            cell[j] = box;
        }
    }
    cell(x, y, z) {
        const i = ((x * this.gridSize) + y) * this.gridSize + z;
        return this.grid[i];
    }
}
export function volume(min, max) {
    return {
        min, max,
        invSize: aether.vec3.div(aether.vec3.of(2, 2, 2), aether.vec3.sub(max, min))
    };
}
//# sourceMappingURL=scene.js.map