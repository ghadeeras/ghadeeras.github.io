import { gpu } from "lumen"
import * as aether from "aether"
import { StrokeAttributes, strokeAttributesStruct, commonWGSL, strokePointsPairStruct } from "./common.js"

// TODO Make the class stateless and use the attributes cache in the Brush class.
export class TessellatedStrokeFactory {

    private constructor(private device: gpu.Device, private shader: TesselationShader, private attributes: StrokeAttributes) {
    }

    static async create(device: gpu.Device, attributes: StrokeAttributes = { color: [0, 0, 0, 1], thickness: 8, tension: 8, closed: 0 }): Promise<TessellatedStrokeFactory> {
        return new TessellatedStrokeFactory(device, await TesselationShader.create(device), { ...attributes })
    }

    get strokeThickness() {
        return this.attributes.thickness
    }

    set strokeThickness(thickness: number) {
        this.attributes.thickness = thickness
    }

    get strokeTension() {
        return this.attributes.tension
    }

    set strokeTension(tension: number) {
        this.attributes.tension = Math.round(tension)
    }

    get strokeColor() {
        return this.attributes.color
    }

    set strokeColor(color: aether.Vec4) {
        this.attributes.color = color
    }

    get strokeClosed() {
        return this.attributes.closed === 1
    }

    set strokeClosed(closed: boolean) {
        this.attributes.closed = closed ? 1 : 0
    }

    tesselate(inputStrokePoints: StrokePoint[], segmentsPerUnitLength: number = 0.25): gpu.DataBuffer {
        const r = 0.5 * this.strokeThickness
        if (inputStrokePoints[inputStrokePoints.length - 1].linear[0] < r) {
            const p = inputStrokePoints[0].position
            return this.device.dataBuffer({
                usage: ["STORAGE"],
                data: strokePointsPairStruct.view([{
                    left: aether.vec2.add(p, [0, -r]),
                    right: aether.vec2.add(p, [0, r]),
                    linear: [0, 0]
                }])
            })
        }
        const start = inputStrokePoints[0]
        const end = inputStrokePoints[inputStrokePoints.length - 1]
        const startDist = start.linear[0]
        const endDist = end.linear[0]
        const closingSegmentLength = this.attributes.closed === 1 ? aether.vec2.distance(start.position, end.position) : 0
        const strokeLength = endDist - startDist + closingSegmentLength
        const segmentsCount = Math.max(Math.ceil(strokeLength * segmentsPerUnitLength), 1.0);
        const group = this.shader.tesselationGroup(this.attributes, inputStrokePoints, segmentsCount)
        this.shader.tesselate(group)
        const buffer = group.entries.outputStrokePoints.baseResource()
        group.entries.strokeAttributes.baseResource().destroy()
        group.entries.inputStrokePoints.baseResource().destroy()
        return buffer
    }

}

export class TesselationShader {

    private constructor(private pipeline: gpu.CompatibleComputePipeline<TesselationPipelineLayout>, private workGroupSize: number) {}

    static async create(device: gpu.Device): Promise<TesselationShader> {
        const layout = tesselationPipelineLayout(tesselationGroupLayout(device))
        const workGroupSize = device.suggestedGroupSizes()[0][0]
        const module = await device.shaderModule({ 
            code: tesselationShader, 
            templateFunction: code => code.replace(/\[\[workgroup_size\]\]/g, workGroupSize.toFixed(0)) 
        })
        const pipeline = await layout.computePipeline({ module }, "Tesselation Pipeline")
        return new TesselationShader(pipeline, workGroupSize)
    }

    tesselationGroup(strokeAttributes: StrokeAttributes, inputStrokePoints: StrokePoint[], segmentsCount: number): TesselationGroup {
        return this.pipeline.bindGroup("tesselation", this.pipeline.device.dataBuffers({
            strokeAttributes: { usage: ["UNIFORM"], data: strokeAttributesStruct.view([strokeAttributes]) },
            inputStrokePoints: { usage: ["STORAGE"], data: inputPointStruct.view(inputStrokePoints) },
            outputStrokePoints: { usage: ["STORAGE"], size: strokePointsPairStruct.paddedSize * (segmentsCount + 1) },
        }))
    }

    tesselate(tesselation: TesselationGroup) {
        const pointsCount = Math.ceil(tesselation.entries.outputStrokePoints.baseResource().size / strokePointsPairStruct.paddedSize);
        const workGroupsCount = Math.ceil(pointsCount / this.workGroupSize);
        this.pipeline
            .withGroups({ tesselation })
            .dispatchWorkGroups(workGroupsCount)
            .enqueue()
    }

}

export type StrokePoint = gpu.DataTypeOf<typeof inputPointStruct>
export const inputPointStruct = gpu.struct({
    position: gpu.f32.x2,
    linear: gpu.f32.x2,
}) 

export const strokeAttributesBinding = gpu.uniform(strokeAttributesStruct)
export const inputStrokePointsBinding = gpu.storage("read", inputPointStruct)
export const outputStrokePointsBinding = gpu.storage("read_write", strokePointsPairStruct)

export type TesselationPipelineLayout = ReturnType<typeof tesselationPipelineLayout>
export function tesselationPipelineLayout(groupLayout: TesselationGroupLayout) {
    const device = groupLayout.device
    return device.pipelineLayout({
        tesselation: groupLayout.asEntry(0),
    }, "Tesselation Pipeline Layout")
}

export type TesselationGroup = gpu.CompatibleBindGroup<TesselationGroupLayout>
export type TesselationGroupLayout = ReturnType<typeof tesselationGroupLayout>
export function tesselationGroupLayout(device: gpu.Device) {
    return device.groupLayout({
        strokeAttributes: strokeAttributesBinding.asEntry(0, "COMPUTE"),
        inputStrokePoints: inputStrokePointsBinding.asEntry(1, "COMPUTE"),
        outputStrokePoints: outputStrokePointsBinding.asEntry(2, "COMPUTE"),
    }, "Tesselation Group Layout")
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
        let curve_length = curve_length();
        let dist = curve_length * (f32(index) / f32(points_count - 1u));
        let i = closest_point_index(dist);
        let t = float_index(i, dist, curve_length);
        let p = spline(t, curve_length);
        return p;
    }

    fn curve_length() -> f32 {
        let i_max = arrayLength(&input_stroke_points) - 1u;
        let first_point = input_stroke_points[0u];
        let last_point = input_stroke_points[i_max];
        let closing_segment_length = select(0.0, distance(last_point.position, first_point.position), stroke_attributes.closed == 1u);
        return last_point.linear.x + closing_segment_length;
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

    fn float_index(index: u32, dist: f32, curve_length: f32) -> f32 {
        let input_stroke_points_count = arrayLength(&input_stroke_points);
        let i_max = input_stroke_points_count - 1u + stroke_attributes.closed;
        let i_0 = min(index, i_max - 1u);
        let i_1 = (i_0 + 1u) % input_stroke_points_count;
        let p_0 = input_stroke_points[i_0];
        let p_1 = input_stroke_points[i_1];
        let d_0 = p_0.linear.x;
        let d_1 = select(p_1.linear.x, curve_length, i_1 == 0u);
        return select(f32(index), f32(i_0) + (dist - d_0) / (d_1 - d_0), d_0 != d_1);
    }

    fn spline(t: f32, curve_length: f32) -> StrokePointsPair {
        let index_1 = i32(floor(t));
        let index_2 = index_1 + 1;
        var w = vec2(0.0);
        var p = Point(vec2(0.0), vec2(0.0), vec2(0.0));
        var v = 0.0;
        let iterations_count = i32(ceil(transfer_function_width() * 0.5));
        for (var i = 0; i < iterations_count; i = i + 1) {
            let i_1 = index_1 - i;
            let i_2 = index_2 + i;
            let p_1 = input_point(i_1, curve_length);
            let p_2 = input_point(i_2, curve_length);
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

    // TODO Replace with incremental approach.
    fn input_point(i: i32, curve_length: f32) -> StrokePoint {
        let input_stroke_points_count = i32(arrayLength(&input_stroke_points));
        let mirror_index = select(
            select(
                select(
                    i, 
                    input_stroke_points_count - 1, 
                    i >= input_stroke_points_count
                ), 
                0, 
                i < 0
            ), 
            i, 
            stroke_attributes.closed == 1u
        );
        let j = 2 * mirror_index - i;
        let offset = select(0.0, f32(j / input_stroke_points_count) * curve_length, stroke_attributes.closed == 1u);
        let index = select(clamp(j, 0, input_stroke_points_count - 1), j % input_stroke_points_count, stroke_attributes.closed == 1u);
        let p = input_stroke_points[select(index, index + input_stroke_points_count, index < 0)];
        var point = StrokePoint(p.position, p.linear + vec2(select(offset, offset - curve_length, index < 0), 0.0));
        if (mirror_index != i) {
            let mirror_point = input_stroke_points[mirror_index];
            point.position = 2.0 * mirror_point.position - point.position;
            point.linear.x = 2.0 * mirror_point.linear.x - point.linear.x;
        }
        return point;
    }

    fn transfer_function(t: f32) -> vec2f {
        let w = PI / tension();
        let angle = w * t;
        return vec2f(cos(angle) + 1.0, -w * sin(angle));
    }

    fn transfer_function_width() -> f32 {
        return 2.0 * tension();
    }

    fn tension() -> f32 {
        return min(stroke_attributes.tension, f32(max(arrayLength(&input_stroke_points), 2u)));
    }
`