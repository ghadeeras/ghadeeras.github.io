import { gpu } from "lumen";
import * as aether from "aether";
import { strokeAttributesStruct, commonWGSL, strokePointsPairStruct } from "./common.js";
export class TessellatedStrokeFactory {
    constructor(device, shader, attributes) {
        this.device = device;
        this.shader = shader;
        this.attributes = attributes;
    }
    static async create(device, attributes = { color: [0, 0, 0, 1], thickness: 8, tension: 8 }) {
        return new TessellatedStrokeFactory(device, await TesselationShader.create(device), { ...attributes });
    }
    get strokeThickness() {
        return this.attributes.thickness;
    }
    set strokeThickness(thickness) {
        this.attributes.thickness = thickness;
    }
    get strokeTension() {
        return this.attributes.tension;
    }
    set strokeTension(tension) {
        this.attributes.tension = Math.round(tension);
    }
    get strokeColor() {
        return this.attributes.color;
    }
    set strokeColor(color) {
        this.attributes.color = color;
    }
    tesselate(inputStrokePoints, segmentsPerUnitLength = 0.25) {
        const r = 0.5 * this.strokeThickness;
        if (inputStrokePoints[inputStrokePoints.length - 1].linear[0] < r) {
            const p = inputStrokePoints[0].position;
            return this.device.dataBuffer({
                usage: ["STORAGE"],
                data: strokePointsPairStruct.view([{
                        left: aether.vec2.add(p, [0, -r]),
                        right: aether.vec2.add(p, [0, r]),
                        linear: [0, 0]
                    }])
            });
        }
        const startDist = inputStrokePoints[0].linear[0];
        const endDist = inputStrokePoints[inputStrokePoints.length - 1].linear[0];
        const segmentsCount = Math.max(Math.ceil((endDist - startDist) * segmentsPerUnitLength), 1.0);
        const group = this.shader.tesselationGroup(this.attributes, inputStrokePoints, segmentsCount);
        this.shader.tesselate(group);
        const buffer = group.entries.outputStrokePoints.baseResource();
        group.entries.strokeAttributes.baseResource().destroy();
        group.entries.inputStrokePoints.baseResource().destroy();
        return buffer;
    }
}
export class TesselationShader {
    constructor(pipeline, workGroupSize) {
        this.pipeline = pipeline;
        this.workGroupSize = workGroupSize;
    }
    static async create(device) {
        const layout = tesselationPipelineLayout(tesselationGroupLayout(device));
        const workGroupSize = device.suggestedGroupSizes()[0][0];
        const module = await device.shaderModule({
            code: tesselationShader,
            templateFunction: code => code.replace(/\[\[workgroup_size\]\]/g, workGroupSize.toFixed(0))
        });
        const pipeline = await layout.computePipeline({ module }, "Tesselation Pipeline");
        return new TesselationShader(pipeline, workGroupSize);
    }
    tesselationGroup(strokeAttributes, inputStrokePoints, segmentsCount) {
        return this.pipeline.bindGroup("tesselation", this.pipeline.device.dataBuffers({
            strokeAttributes: { usage: ["UNIFORM"], data: strokeAttributesStruct.view([strokeAttributes]) },
            inputStrokePoints: { usage: ["STORAGE"], data: inputPointStruct.view(inputStrokePoints) },
            outputStrokePoints: { usage: ["STORAGE"], size: strokePointsPairStruct.paddedSize * segmentsCount },
        }));
    }
    tesselate(tesselation) {
        const segmentsCount = Math.ceil(tesselation.entries.outputStrokePoints.baseResource().size / strokePointsPairStruct.paddedSize);
        const workGroupsCount = Math.ceil(segmentsCount / this.workGroupSize);
        this.pipeline
            .withGroups({ tesselation })
            .dispatchWorkGroups(workGroupsCount)
            .enqueue();
    }
}
export const inputPointStruct = gpu.struct({
    position: gpu.f32.x2,
    linear: gpu.f32.x2,
});
export const strokeAttributesBinding = gpu.uniform(strokeAttributesStruct);
export const inputStrokePointsBinding = gpu.storage("read", inputPointStruct);
export const outputStrokePointsBinding = gpu.storage("read_write", strokePointsPairStruct);
export function tesselationPipelineLayout(groupLayout) {
    const device = groupLayout.device;
    return device.pipelineLayout({
        tesselation: groupLayout.asEntry(0),
    }, "Tesselation Pipeline Layout");
}
export function tesselationGroupLayout(device) {
    return device.groupLayout({
        strokeAttributes: strokeAttributesBinding.asEntry(0, "COMPUTE"),
        inputStrokePoints: inputStrokePointsBinding.asEntry(1, "COMPUTE"),
        outputStrokePoints: outputStrokePointsBinding.asEntry(2, "COMPUTE"),
    }, "Tesselation Group Layout");
}
const tesselationShader = /* wgsl */ `

    ${commonWGSL}

    struct StrokePoint {
        position: vec2f,
        linear: vec2f,
    }

    struct Point {
        position: vec2f,
        velocity: vec2f,
        linear: vec2f,
    }

    @group(0) @binding(0)
    var<uniform> stroke_attributes: StrokeAttributes;
    @group(0) @binding(1)
    var<storage, read> input_stroke_points: array<StrokePoint>;
    @group(0) @binding(2)
    var<storage, read_write> output_stroke_points: array<StrokePointsPair>;
    
    @compute
    @workgroup_size([[workgroup_size]])
    fn tesselate_stroke(@builtin(global_invocation_id) id: vec3<u32>) {
        let points_count = arrayLength(&output_stroke_points);
        let index = id.x;
        if (index >= points_count) {
            return;
        } 
        output_stroke_points[index] = compute_point(index, points_count);
    }

    fn compute_point(index: u32, points_count: u32) -> StrokePointsPair {
        let i_max = arrayLength(&input_stroke_points) - 1u;
        let dist = input_stroke_points[i_max].linear.x * (f32(index) / f32(points_count));
        let i = closest_point_index(dist);
        let t = float_index(i, dist);
        let p = spline(t);
        return p;
    }

    fn closest_point_index(dist: f32) -> u32 {
        var i_min = 0u;
        var i_max = arrayLength(&input_stroke_points) - 1u;
        if (dist <= input_stroke_points[i_min].linear.x) {
            return i_min;
        } else if (dist >= input_stroke_points[i_max].linear.x) {
            return i_max;
        } else {
            while (i_min < i_max) {
                let i = (i_min + i_max) >> 1u;
                if (dist < input_stroke_points[i].linear.x) {
                    i_max = i - 1u;
                } else if (dist >= input_stroke_points[i + 1u].linear.x) {
                    i_min = i + 1u;
                } else {
                    return i;
                }
            }
            return i_max;
        }
    }

    fn float_index(index: u32, dist: f32) -> f32 {
        let i_max = arrayLength(&input_stroke_points) - 1u;
        let i_0 = min(index   , i_max - 1u);
        let i_1 = i_0 + 1u;
        let d_0 = input_stroke_points[i_0].linear.x;
        let d_1 = input_stroke_points[i_1].linear.x;
        return select(f32(index), f32(i_0) + (dist - d_0) / (d_1 - d_0), d_0 != d_1);
    }

    fn spline(t: f32) -> StrokePointsPair {
        let index_1 = i32(floor(t));
        let index_2 = index_1 + 1;
        var w = vec2(0.0);
        var p = Point(vec2(0.0), vec2(0.0), vec2(0.0));
        var v = 0.0;
        let iterations_count = i32(ceil(transfer_function_width() * 0.5));
        for (var i = 0; i < iterations_count; i = i + 1) {
            let i_1 = index_1 - i;
            let i_2 = index_2 + i;
            let p_1 = input_point(i_1);
            let p_2 = input_point(i_2);
            let w_1 = transfer_function(t - f32(i_1));
            let w_2 = transfer_function(t - f32(i_2));
            w += w_1 + w_2;
            p.position += p_1.position * w_1.x + p_2.position * w_2.x;
            p.velocity += p_1.position * w_1.y + p_2.position * w_2.y;
            p.linear += p_1.linear * w_1.x + p_2.linear * w_2.x;
            v += p_1.linear.x * w_1.y + p_2.linear.x * w_2.y;
        }
        let inverse_w = 1.0 / w.x;
        w.y *= inverse_w;
        v = (v - w.y * p.linear.x) * inverse_w; 
        p.velocity = (p.velocity - w.y * p.position) * inverse_w / v; 
        p.position *= inverse_w;
        p.linear *= inverse_w;
        return output_point(p);
    }

    fn output_point(p: Point) -> StrokePointsPair {
        let left = 0.5 * stroke_attributes.thickness * vec2(p.velocity.y, -p.velocity.x); 
        return StrokePointsPair(
            p.position + left, p.position - left, p.linear
        );
    }

    fn input_point(i: i32) -> StrokePoint {
        let max_point_index = i32(arrayLength(&input_stroke_points)) - 1;
        return input_stroke_points[clamp(i, 0, max_point_index)];
    }

    fn transfer_function(t: f32) -> vec2f {
        let w = PI / stroke_attributes.tension;
        let angle = w * t;
        return vec2f(cos(angle) + 1.0, -w * sin(angle));
    }

    fn transfer_function_width() -> f32 {
        return 2.0 * stroke_attributes.tension;
    }
`;
//# sourceMappingURL=stroke.computer.js.map