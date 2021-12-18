import { ether } from "/gen/libs.js";
const weights = [0.5, 1, 0.5];
export class Carving {
    constructor(stone, mvpMat, picker, scalarFieldModule, brushSampler) {
        this.stone = stone;
        this.mvpMat = mvpMat;
        this.picker = picker;
        this.scalarFieldModule = scalarFieldModule;
        this.brushSampler = brushSampler;
        this.brushes = [];
        this.carving = false;
        this.currentStone = stone();
        const resolution = this.currentStone.resolution;
        this.draftStone = scalarFieldModule.newInstance();
        this.draftStone.resolution = resolution;
        for (let brushResolution = resolution / 4; brushResolution >= 2; brushResolution /= 2) {
            const brush = this.generateBrush(brushResolution);
            this.brushes.push(brush);
        }
    }
    generateBrush(brushResolution) {
        const brush = this.scalarFieldModule.newInstance();
        const count = this.brushes.length;
        brush.resolution = Math.round(brushResolution);
        brush.sampler = count == 0 ?
            this.brushSampler :
            (x, y, z) => this.downSample(this.brushes[count - 1], brush.resolution, x, y, z);
        ensureSamplingOf(brush);
        return brush;
    }
    downSample(b, brushResolution, x, y, z) {
        const d = 1 / brushResolution;
        const result = [0, 0, 0, 0];
        let weightsSum = 0;
        for (let i = -1; i <= 1; i++) {
            const w = weights[i + 1];
            for (let j = -1; j <= 1; j++) {
                const ww = w * weights[j + 1];
                for (let k = -1; k <= 1; k++) {
                    const www = ww * weights[k + 1];
                    const sample = b.get(x + i * d, y + j * d, z + k * d);
                    ether.mutVec4.add(result, ether.vec4.scale(sample, www));
                    weightsSum += www;
                }
            }
        }
        return ether.mutVec4.scale(result, 1 / weightsSum);
    }
    undo() {
        const stone = this.currentStone;
        this.currentStone = this.draftStone;
        return this.draftStone = stone;
    }
    currentValue() {
        if (this.carving) {
            return this.draftStone;
        }
        const stone = this.stone();
        if (this.draftStone === stone) {
            this.draftStone = this.currentStone;
        }
        this.currentStone = stone;
        ensureSamplingOf(stone);
        this.draftStone.sampler = (x, y, z) => stone.get(x, y, z);
        this.draftStone.contourValue = stone.contourValue;
        if (this.draftStone.resolution != stone.resolution) {
            this.draftStone.resolution = stone.resolution;
        }
        this.carving = true;
        return stone;
    }
    mapper(stone, from) {
        const [mouseX0, mouseY0] = from;
        const originalSample = {
            hit: false,
            position: ether.vec3.of(0, 0, 0),
            normal: ether.vec3.of(0, 0, 0),
            projection: ether.mat3.identity(),
            rejection: ether.mat3.identity(),
        };
        this.picker.pick(this.mvpMat(), mouseX0, mouseY0).then(pos => {
            originalSample.hit = pos[3] == 1;
            originalSample.position = ether.vec3.from(pos);
            const field = ether.vec3.from(stone.get(...originalSample.position));
            originalSample.normal = ether.vec3.unit(ether.vec3.from(field));
            originalSample.projection = ether.mat3.projectionOn(originalSample.normal);
            originalSample.rejection = ether.mat3.sub(ether.mat3.identity(), originalSample.projection);
        });
        const maxLevel = this.brushes.length - 1;
        const minScale = this.brushes[maxLevel].resolution / this.brushes[0].resolution;
        const maxScale = 1 / minScale;
        return ([mouseX, mouseY]) => {
            if (originalSample.hit) {
                const [x0, y0, z0] = originalSample.position;
                const depth = sat(8 * Math.abs(mouseY - mouseY0), minScale, maxScale);
                const width = sat(8 * Math.abs(mouseX - mouseX0), minScale, maxScale);
                const mat = ether.mat3.add(ether.mat3.scale(originalSample.projection, 4 / depth), ether.mat3.scale(originalSample.rejection, 4 / width));
                const widthLevel = -Math.log2(width);
                const depthLevel = -Math.log2(depth);
                const brush = this.brushes[Math.floor(Math.max(widthLevel, depthLevel, 0))];
                ensureSamplingOf(stone);
                this.draftStone.sampler = (x, y, z) => {
                    const stoneSample = this.carving ? stone.getNearest(x, y, z) : stone.get(x, y, z);
                    const brushPosition = ether.mat3.apply(mat, [x - x0, y - y0, z - z0]);
                    const brushSample = brush.get(...brushPosition);
                    const brushGradient = ether.mat3.apply(mat, ether.vec3.from(brushSample));
                    const brushValue = brushSample[3];
                    const distortedBrush = [...brushGradient, brushValue];
                    return mouseY > mouseY0 ?
                        ether.vec4.add(stoneSample, distortedBrush) :
                        ether.vec4.sub(stoneSample, distortedBrush);
                };
            }
            return this.draftStone;
        };
    }
    finalize(value) {
        this.carving = false;
        return value;
    }
}
function sat(v, min, max) {
    return Math.min(Math.max(v, min), max);
}
function ensureSamplingOf(stone) {
    stone.get(0, 0, 0);
}
//# sourceMappingURL=carving.js.map