import { gpu } from "lumen";
export class Renderer {
    constructor(pipelineLayout, pipeline) {
        this.pipelineLayout = pipelineLayout;
        this.pipeline = pipeline;
    }
    static async create(device, format = navigator.gpu.getPreferredCanvasFormat()) {
        const layout = pipelineLayout(groupLayouts(device));
        const module = await device.shaderModule({ code: shader });
        const pipeline = await device.wrapped.createRenderPipelineAsync({
            layout: layout.wrapped,
            vertex: {
                module: module.wrapped
            },
            fragment: {
                module: module.wrapped,
                targets: [{
                        format,
                        blend: {
                            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
                            alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
                        }
                    }]
            },
            primitive: {
                topology: "triangle-list"
            },
        });
        return new Renderer(layout, pipeline);
    }
    view(view) {
        return this.pipelineLayout.descriptor.view.layout.bindGroup({
            view: this.pipelineLayout.device.dataBuffer({
                usage: ["UNIFORM"],
                data: viewStruct.view([view])
            })
        });
    }
    stroke(curveSegments, strokeAttributes) {
        return this.pipelineLayout.descriptor.stroke.layout.bindGroup(this.pipelineLayout.device.syncBuffers({
            stroke: {
                usage: ["STORAGE"],
                data: curveSegmentStruct.view(curveSegments)
            },
            strokeAttributes: {
                usage: ["UNIFORM"],
                data: strokeAttributesStruct.view([strokeAttributes])
            }
        }));
    }
    resize(group, view) {
        const b = group.entries.view;
        b.set(viewStruct).fromData(viewStruct.view([view]));
    }
    renderTo(attachment, strokes, view) {
        this.pipelineLayout.device.enqueueCommands("rendering", encoder => {
            encoder.renderPass({ colorAttachments: [attachment] }, pass => {
                pass.setPipeline(this.pipeline);
                this.pipelineLayout.addTo(pass, { view });
                for (const stroke of strokes) {
                    const strokeAttributesBuffer = stroke.entries.strokeAttributes;
                    const strokeBuffer = stroke.entries.stroke;
                    this.pipelineLayout.addTo(pass, { stroke });
                    pass.draw(strokeAttributesBuffer.get(strokeAttributesStruct.members.resolution) * 6, Math.ceil(strokeBuffer.gpuBuffer.size / curveSegmentStruct.paddedSize));
                }
            });
        });
    }
}
export const curveSegmentStruct = gpu.struct({
    control_point: gpu.f32.x2
});
export const strokeAttributesStruct = gpu.struct({
    brush_size: gpu.f32,
    locality: gpu.f32,
    resolution: gpu.u32
});
export const viewStruct = gpu.struct({
    width: gpu.f32,
    height: gpu.f32
});
export const strokeBinding = gpu.storage("read", curveSegmentStruct);
export const strokeAttributesBinding = gpu.uniform(strokeAttributesStruct);
export const viewBinding = gpu.uniform(viewStruct);
export function groupLayouts(device, label) {
    return device.groupLayouts({
        stroke: {
            stroke: strokeBinding.asEntry(0, "VERTEX"),
            strokeAttributes: strokeAttributesBinding.asEntry(1, "VERTEX", "FRAGMENT")
        },
        view: {
            view: viewBinding.asEntry(0, "VERTEX", "FRAGMENT")
        }
    }, label);
}
export function pipelineLayout(groupLayouts, label) {
    const device = groupLayouts.stroke.device;
    return device.pipelineLayout({
        stroke: groupLayouts.stroke.asEntry(0),
        view: groupLayouts.view.asEntry(1),
    }, label);
}
const shader = /* wgsl */ `

    const PI = atan2(0.0, -1.0);

    struct CurveSegment {
        control_point: vec2f
    }

    struct StrokeAttributes {
        brush_size: f32,
        locality: f32,
        resolution: u32
    }

    struct View {
        width: f32,
        height: f32
    }

    struct SplinePoint {
        position: vec2f,
        tangent: vec2f
    }

    struct InputVertex {
        @builtin(vertex_index) vertex_index: u32,
        @builtin(instance_index) curve_segment_index: u32,
    }

    struct Vertex {
        @builtin(position) stage_space_position: vec4f,
        @location(0) position: vec2f,
        @interpolate(flat) @location(1) mini_segment: vec4f,
    }

    struct Fragment {
        @location(0) color: vec4f
    }

    @group(0) @binding(0)
    var<storage, read> stroke: array<CurveSegment>;
    @group(0) @binding(1)
    var<uniform> stroke_attributes: StrokeAttributes;
    
    @group(1) @binding(0)
    var<uniform> view: View;

    @vertex
    fn vertex_main(input: InputVertex) -> Vertex {
        let mini_segment = compute_mini_segment(input.curve_segment_index, input.vertex_index / 6u);
        let position = quad_vertex_position(mini_segment, input.vertex_index % 6u); 
        let clip_position = vec4(
            2.0 * position.x / view.width - 1.0, 
            1.0 - 2.0 * position.y / view.height,
            0.0,
            1.0
        );
        return Vertex(
            clip_position, 
            position, 
            mini_segment
        );
    }

    @fragment
    fn fragment_main(input: Vertex) -> Fragment {
        let pixel_width = dpdxFine(input.position);
        let pixel_height = dpdyFine(input.position);
        let color = 0.25 * (
            fragment_color(input.mini_segment.xy, input.mini_segment.zw, input.position) +
            fragment_color(input.mini_segment.xy, input.mini_segment.zw, input.position + 0.5 * pixel_width) +
            fragment_color(input.mini_segment.xy, input.mini_segment.zw, input.position + 0.5 * pixel_height) +
            fragment_color(input.mini_segment.xy, input.mini_segment.zw, input.position + 0.5 * (pixel_width + pixel_height))
        );
        if (color.a <= 0.0) {
            discard;
        }
        return Fragment(color);
    }

    fn fragment_color(start_position: vec2f, end_position: vec2f, position: vec2f) -> vec4f {
        let sdf = mini_segment_sdf(start_position, end_position, position);
        let alpha = smoothstep(0.0, 4.0, -sdf);
        return vec4(vec3(0.0), alpha);
    }

    fn compute_mini_segment(curve_segment_index: u32, tiny_segment_index: u32) -> vec4f {
        let density = 1.0 / f32(stroke_attributes.resolution);
        let t_0 = f32(curve_segment_index) + f32(tiny_segment_index) * density;
        let t_1 = t_0 + density;
        return vec4(spline(t_0), spline(t_1));
    }

    const quad_vertex_ids: array<u32, 6> = array<u32, 6>(
        0u, 1u, 2u,
        2u, 1u, 3u
    );

    fn quad_vertex_position(mini_segment: vec4f, quad_vertex_index: u32) -> vec2f {
        let start_position = mini_segment.xy;
        let end_position = mini_segment.zw;
        let quad_vertex_id = quad_vertex_ids[quad_vertex_index];
        let half_brush_size = 0.5 * stroke_attributes.brush_size;
        let segment = end_position - start_position;
        let segment_length = length(segment);
        let along_axis = segment / segment_length;
        let across_axis = vec2(-along_axis.y, along_axis.x);
        let m = mat2x2(along_axis, across_axis);
        let local_position = select(
            select(
                vec2(segment_length + half_brush_size, half_brush_size), 
                vec2(-half_brush_size, half_brush_size), 
                (quad_vertex_id & 1u) == 0u),
            select(
                vec2(segment_length + half_brush_size, -half_brush_size), 
                vec2(-half_brush_size, -half_brush_size), 
                (quad_vertex_id & 1u) == 0u),
            (quad_vertex_id & 2u) == 0u
        );
        return m * local_position + start_position;
    }

    fn spline(t: f32) -> vec2f {
        let points_count = arrayLength(&stroke);
        let half_points_count = (points_count >> 1u) + (points_count & 1u);
        let index_1 = u32(floor(t));
        let index_2 = index_1 + 1u;
        var position = vec2(0.0);
        var w = 0.0;
        for (var i = 0u; i < half_points_count; i = i + 1u) {
            let i_1 = index_1 - i;
            let i_2 = index_2 + i;
            let w_1 = transfer_function(t - f32(i_1));
            let w_2 = transfer_function(t - f32(i_2));
            if (w_1.y == 0.0 && w_2.y == 0.0) {
                break;
            }
            w += w_1.x + w_2.x;
            position += control_point(i_1) * w_1.x + control_point(i_2) * w_2.x;
        }
        return position / w;
    }

    fn control_point(i: u32) -> vec2f {
        let max_point_index = arrayLength(&stroke) - 1u;
        return stroke[clamp(i, 0u, max_point_index)].control_point;
    }

    fn transfer_function(t: f32) -> vec2f {
        let angle = 2.0 * PI * stroke_attributes.locality * t;
        return select(
            vec2(0.0), 
            vec2(cos(angle) + 1.0, 1.0), 
            abs(angle) < PI
        );
    }

    fn mini_segment_sdf(start_position: vec2f, end_position: vec2f, p: vec2f) -> f32 {
        let relative_p = p - start_position;
        let segment = end_position - start_position;
        let segment_length = length(segment);
        let along_axis = segment / segment_length;
        let across_axis = vec2(-along_axis.y, along_axis.x);

        let along_axis_component = dot(relative_p, along_axis);
        let across_axis_component = dot(relative_p, across_axis);
        let clamped_along_axis_component = clamp(along_axis_component, 0.0, segment_length);
        let dist = length(vec2(along_axis_component - clamped_along_axis_component, across_axis_component));

        return dist - 0.5 * stroke_attributes.brush_size;
    }
`;
//# sourceMappingURL=stroke.renderer.js.map