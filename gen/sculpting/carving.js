import { aether } from "/gen/libs.js";
const weights = [0.5, 1, 0.5];
export class Carving {
    constructor(currentStone, mvpMat, picker, scalarFieldModule, brushSampler) {
        this.currentStone = currentStone;
        this.mvpMat = mvpMat;
        this.picker = picker;
        this.scalarFieldModule = scalarFieldModule;
        this.brushSampler = brushSampler;
        this.brushes = [];
        const stone = currentStone();
        this.prevStone = recycle(scalarFieldModule.newInstance(), stone);
        this.nextStone = stone;
        for (let brushResolution = stone.resolution / 4; brushResolution >= 2; brushResolution /= 2) {
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
                    aether.mutVec4.add(result, aether.vec4.scale(sample, www));
                    weightsSum += www;
                }
            }
        }
        return aether.mutVec4.scale(result, 1 / weightsSum);
    }
    undo() {
        const currentStone = this.prevStone;
        this.prevStone = this.currentStone();
        return currentStone;
    }
    currentValue() {
        const currentStone = this.currentStone();
        this.nextStone = recycle(this.prevStone, currentStone);
        return this.prevStone = currentStone;
    }
    mapper(stone, from) {
        const [mouseX0, mouseY0] = from;
        const originalSample = {
            hit: false,
            position: aether.vec3.of(0, 0, 0),
            normal: aether.vec3.of(0, 0, 0),
            projection: aether.mat3.identity(),
            rejection: aether.mat3.identity(),
        };
        this.picker.pick(this.mvpMat(), mouseX0, mouseY0).then(pos => {
            originalSample.hit = pos[3] == 1;
            originalSample.position = aether.vec3.from(pos);
            const field = aether.vec3.from(stone.get(...originalSample.position));
            originalSample.normal = aether.vec3.unit(aether.vec3.from(field));
            originalSample.projection = aether.mat3.projectionOn(originalSample.normal);
            originalSample.rejection = aether.mat3.sub(aether.mat3.identity(), originalSample.projection);
        });
        const maxLevel = this.brushes.length - 1;
        const minScale = this.brushes[maxLevel].resolution / this.brushes[0].resolution;
        const maxScale = 1 / minScale;
        return ([mouseX, mouseY]) => {
            if (originalSample.hit) {
                const [x0, y0, z0] = originalSample.position;
                const depth = sat(8 * Math.abs(mouseY - mouseY0), minScale, maxScale);
                const width = sat(8 * Math.abs(mouseX - mouseX0), minScale, maxScale);
                const mat = aether.mat3.add(aether.mat3.scale(originalSample.projection, 4 / depth), aether.mat3.scale(originalSample.rejection, 4 / width));
                const widthLevel = -Math.log2(width);
                const depthLevel = -Math.log2(depth);
                const brush = this.brushes[Math.floor(Math.max(widthLevel, depthLevel, 0))];
                this.nextStone.sampler = (x, y, z) => {
                    const stoneSample = stone.get(x, y, z);
                    const brushPosition = aether.mat3.apply(mat, [x - x0, y - y0, z - z0]);
                    const brushSample = brush.get(...brushPosition);
                    const brushGradient = aether.mat3.apply(mat, aether.vec3.from(brushSample));
                    const brushValue = brushSample[3];
                    const distortedBrush = [...brushGradient, brushValue];
                    return mouseY > mouseY0 ?
                        aether.vec4.add(stoneSample, distortedBrush) :
                        aether.vec4.sub(stoneSample, distortedBrush);
                };
            }
            return this.nextStone;
        };
    }
    finalize(stone) {
        return stone;
    }
}
function sat(v, min, max) {
    return Math.min(Math.max(v, min), max);
}
function recycle(recyclableStone, exampleStone) {
    ensureSamplingOf(exampleStone);
    recyclableStone.sampler = (x, y, z) => exampleStone.get(x, y, z);
    recyclableStone.contourValue = exampleStone.contourValue;
    if (recyclableStone.resolution != exampleStone.resolution) { // To avoid unnecessary reallocation of memory
        recyclableStone.resolution = exampleStone.resolution;
    }
    return recyclableStone;
}
function ensureSamplingOf(stone) {
    stone.get(0, 0, 0);
    return stone;
}
//# sourceMappingURL=carving.js.map