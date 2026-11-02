import type { Mat4, Vec4 } from "aether";
import { mat3, mutVec4, ScalarFieldInstance, ScalarFieldModule, ScalarFieldSampler, vec3, vec4 } from "aether";
import * as gear from "gear";
import { Picker } from "../scalar-field/view.js";

const weights = [0.5, 1, 0.5]

export class Carving implements gear.loops.Dragger<ScalarFieldInstance> {

    private spareStone: ScalarFieldInstance
    private readonly brushes: ScalarFieldInstance[] = []

    constructor(
        stone: ScalarFieldInstance,
        private mvpMat: () => Mat4,
        private picker: Picker, 
        private scalarFieldModule: ScalarFieldModule,
        private brushSampler: ScalarFieldSampler,
    ) {
        this.spareStone = recycle(scalarFieldModule.newInstance(), stone);

        for (let brushResolution = stone.resolution / 4; brushResolution >= 2; brushResolution /= 2) {
            const brush = this.generateBrush(brushResolution);
            this.brushes.push(brush) 
        }
    }

    private generateBrush(brushResolution: number) {
        const brush = this.scalarFieldModule.newInstance();
        
        const count = this.brushes.length;
        brush.resolution = Math.round(brushResolution);
        brush.sampler = count == 0 ? 
            this.brushSampler : 
            (x, y, z) => this.downSample(this.brushes[count - 1], brush.resolution, x, y, z)
        
        ensureSamplingOf(brush);
        return brush;
    }

    private downSample(b: ScalarFieldInstance, brushResolution: number, x: number, y: number, z: number) {
        const d = 1 / brushResolution;
        const result: Vec4 = vec4.fromScalar(0);
        let weightsSum = 0;
        for (let i = -1; i <= 1; i++) {
            const w = weights[i + 1];
            for (let j = -1; j <= 1; j++) {
                const ww = w * weights[j + 1];
                for (let k = -1; k <= 1; k++) {
                    const www = ww * weights[k + 1];
                    const sample = b.get(x + i * d, y + j * d, z + k * d);
                    mutVec4.add(result, vec4.scale(sample, www));
                    weightsSum += www;
                }
            }
        }
        return mutVec4.scale(result, 1 / weightsSum);
    }

    undo(stone: ScalarFieldInstance): ScalarFieldInstance {
        const newStone = ensureSamplingOf(this.spareStone)
        this.spareStone = ensureSamplingOf(stone)
        return newStone
    }

    begin(stone: ScalarFieldInstance, from: gear.loops.PointerPosition): gear.loops.DraggingFunction<ScalarFieldInstance> {
        const newStone = recycle(this.spareStone, stone)
        this.spareStone = stone

        const [mouseX0, mouseY0] = from
        const originalSample = {
            hit: false,
            position: vec3.fromScalar(0),
            normal: vec3.fromScalar(0),
            projection: mat3.identity(),
            rejection: mat3.identity(),
        }
        this.picker.pick(this.mvpMat(), mouseX0, mouseY0).then(pos => { 
            originalSample.hit = pos[3] == 1
            originalSample.position = vec3.from(pos)
            const field = vec3.from(stone.get(...originalSample.position));
            originalSample.normal = vec3.unit(vec3.from(field))
            originalSample.projection = mat3.projectionOn(originalSample.normal)
            originalSample.rejection = mat3.sub(mat3.identity(), originalSample.projection)
        })
        const maxLevel = this.brushes.length - 1;
        const minScale = this.brushes[maxLevel].resolution / this.brushes[0].resolution;
        const maxScale = 1 / minScale;
        return ([mouseX, mouseY]) => {
            if (originalSample.hit) {
                const [x0, y0, z0] = originalSample.position

                const depth = sat(8 * Math.abs(mouseY - mouseY0), minScale, maxScale)
                const width = sat(8 * Math.abs(mouseX - mouseX0), minScale, maxScale)

                const mat = mat3.add(
                    mat3.scale(originalSample.projection, 4 / depth),
                    mat3.scale(originalSample.rejection, 4 / width),
                )

                const widthLevel = -Math.log2(width)
                const depthLevel = -Math.log2(depth)
                const brush = this.brushes[Math.floor(Math.max(widthLevel, depthLevel, 0))]

                newStone.sampler = (x, y, z) => {
                    const stoneSample = stone.get(x, y, z)
                    const brushPosition = mat3.apply(mat, [x - x0, y - y0, z - z0])
                    const brushSample = brush.get(...brushPosition)
                    const brushGradient = mat3.apply(mat, vec3.from(brushSample))
                    const brushValue = brushSample[3];
                    const distortedBrush: Vec4 = [...brushGradient, brushValue]
                    return mouseY > mouseY0 ?
                        vec4.add(stoneSample, distortedBrush) :
                        vec4.sub(stoneSample, distortedBrush)
                }
            }
            return newStone
        }
    }

    end(stone: ScalarFieldInstance): ScalarFieldInstance {
        return stone
    }

}

function sat(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), max)
}

function recycle(recyclableStone: ScalarFieldInstance, exampleStone: ScalarFieldInstance) {
    ensureSamplingOf(exampleStone)
    recyclableStone.sampler = (x, y, z) => exampleStone.get(x, y, z);
    recyclableStone.contourValue = exampleStone.contourValue;
    if (recyclableStone.resolution != exampleStone.resolution) { // To avoid unnecessary reallocation of memory
        recyclableStone.resolution = exampleStone.resolution;
    }
    return recyclableStone
}

function ensureSamplingOf(stone: ScalarFieldInstance): ScalarFieldInstance {
    stone.get(0, 0, 0);
    return stone
}
