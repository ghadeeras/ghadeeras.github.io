import * as aether from '/aether/latest/index.js';
const NO_BOX = 0xFFFFFFFF;
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
                NO_BOX, NO_BOX, NO_BOX, NO_BOX,
                NO_BOX, NO_BOX, NO_BOX, NO_BOX
            ];
        }
        return grid;
    }
    material(m) {
        return this.materials.push(m) - 1;
    }
    box(min, max, material) {
        const box = {
            volume: { min, max },
            material
        };
        const id = this.boxes.push(box) - 1;
        this.addBox(box, id);
        return id;
    }
    addBox(box, id) {
        let { min, max } = box.volume;
        min = this.toGridCoords(min);
        max = this.toGridCoords(max);
        for (let x = min[0]; x <= max[0]; x++) {
            for (let y = min[1]; y <= max[1]; y++) {
                for (let z = min[2]; z <= max[2]; z++) {
                    this.addBoxToCell(id, x, y, z);
                }
            }
        }
    }
    toGridCoords(v) {
        return aether.vec3.min(aether.vec3.max([Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])], [0, 0, 0]), [this.gridSize - 1, this.gridSize - 1, this.gridSize - 1]);
    }
    addBoxToCell(box, x, y, z) {
        const i = ((x * this.gridSize) + y) * this.gridSize + z;
        const cell = this.grid[i];
        const j = cell.findIndex(b => b === NO_BOX);
        if (j >= 0) {
            cell[j] = box;
        }
    }
}
//# sourceMappingURL=scene.js.map