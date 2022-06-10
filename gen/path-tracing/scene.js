import * as aether from '/aether/latest/index.js';
export const NULL = 0xFFFFFFFF;
export class Scene {
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.grid = this.createGrid();
        this.boxes = [];
        this.lights = [];
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
    material(m) {
        return this.materials.push(m) - 1;
    }
    box(min, max, materials) {
        const box = {
            volume: volume(min, max),
            faces: materials.map((m, face) => {
                const material = this.materials[m];
                let light = NULL;
                if (material[3] < 0) { // i.e. light
                    light = this.addLight(max, min, face);
                }
                return {
                    material: m,
                    light: light
                };
            })
        };
        const id = this.boxes.push(box) - 1;
        this.addBox(box, id);
        return id;
    }
    addLight(max, min, face) {
        const size3D = aether.vec3.sub(max, min);
        const mid = aether.vec3.scale(aether.vec3.add(min, max), 0.5);
        switch (face) {
            case 0: return this.light([mid[0], mid[1], min[2]], [size3D[0], size3D[1]], face);
            case 1: return this.light([mid[0], min[1], mid[2]], [size3D[2], size3D[0]], face);
            case 2: return this.light([min[0], mid[1], mid[2]], [size3D[1], size3D[2]], face);
            case 3: return this.light([max[0], mid[1], mid[2]], [size3D[1], size3D[2]], face);
            case 4: return this.light([mid[0], max[1], mid[2]], [size3D[2], size3D[0]], face);
            case 5: return this.light([mid[0], mid[1], max[2]], [size3D[0], size3D[1]], face);
        }
        return NULL;
    }
    light(position, size, i) {
        return this.lights.push({
            position: position,
            size: size,
            face: i,
            area: size[0] * size[1]
        }) - 1;
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