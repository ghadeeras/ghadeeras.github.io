import { gpu } from "lumen"
import { commonWGSL, StrokeAttributes, strokeAttributesStruct, strokePointsPairStruct } from "./common.js"

export class Renderer {

    constructor(private pipelineLayout: PipelineLayout, private pipeline: GPURenderPipeline) {}

    static async create(device: gpu.Device, format = navigator.gpu.getPreferredCanvasFormat()): Promise<Renderer> {
        const layout = pipelineLayout(groupLayouts(device))
        const module = await device.shaderModule({ code: shader })
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
                        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" } ,
                        alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" } ,
                    } 
                }]
            },
            multisample: {
                count: 4,
            },
            primitive: {
                topology: "triangle-strip",
                frontFace: "ccw",
                cullMode: "back",
            },
        })
        return new Renderer(layout, pipeline)
    }

    view(view: View): ViewBindGroup {
        return this.pipelineLayout.descriptor.view.layout.bindGroup({
            view: this.pipelineLayout.device.dataBuffer({
                usage: ["UNIFORM"],
                data: viewStruct.view([view])
            })
        })
    }

    stroke(strokeAttributes: StrokeAttributes, strokePoints: gpu.DataBuffer): StrokeBindGroup {
        return this.pipelineLayout.descriptor.stroke.layout.bindGroup({
            strokeAttributes: this.pipelineLayout.device.dataBuffer({
                usage: ["UNIFORM"],
                data: strokeAttributesStruct.view([strokeAttributes])
            }),
            strokePoints
        })
    }

    resize(group: ViewBindGroup, view: View) {
        const b = group.entries.view as gpu.DataBuffer
        b.set(viewStruct).fromData(viewStruct.view([view]))
    }

    renderTo(attachment: GPURenderPassColorAttachment, strokes: StrokeBindGroup[], view: ViewBindGroup) {
        this.pipelineLayout.device.enqueueCommands("rendering", encoder => {
            encoder.renderPass({ colorAttachments: [ attachment ] }, pass => {
                pass.setPipeline(this.pipeline)
                this.pipelineLayout.addTo(pass, { view })
                for (const stroke of strokes) {
                    const strokeBuffer = stroke.entries.strokePoints.baseResource()
                    const controlPointsCount = Math.ceil(strokeBuffer.size / strokePointsPairStruct.paddedSize) + 2
                    this.pipelineLayout.addTo(pass, { stroke })
                    pass.draw(controlPointsCount * 2)
                }
            })
        })
    }

}

export type View = gpu.DataTypeOf<typeof viewStruct>
export const viewStruct = gpu.struct({
    width: gpu.f32,
    height: gpu.f32
})

export const strokeAttributesBinding = gpu.uniform(strokeAttributesStruct)
export const strokePointsBinding = gpu.storage("read", strokePointsPairStruct)
export const viewBinding = gpu.uniform(viewStruct)

export type StrokeBindGroup = gpu.CompatibleBindGroup<GroupLayouts["stroke"]>
export type ViewBindGroup = gpu.CompatibleBindGroup<GroupLayouts["view"]>
export type GroupLayouts = ReturnType<typeof groupLayouts>
export function groupLayouts(device: gpu.Device, label?: string) {
    return device.groupLayouts({
        stroke: {
            strokeAttributes: strokeAttributesBinding.asEntry(0, "FRAGMENT"),
            strokePoints: strokePointsBinding.asEntry(1, "VERTEX"),
        },
        view: {
            view: viewBinding.asEntry(0, "VERTEX")
        }
    }, label)
}

export type PipelineLayout = ReturnType<typeof pipelineLayout>
export function pipelineLayout(groupLayouts: GroupLayouts, label?: string) {
    const device = groupLayouts.stroke.device
    return device.pipelineLayout({
        stroke: groupLayouts.stroke.asEntry(0),
        view: groupLayouts.view.asEntry(1),
    }, label)
}

const shader = /* wgsl */ `

    ${commonWGSL}

    struct View {
        width: f32,
        height: f32,
    }

    struct InputVertex {
        @builtin(vertex_index) vertex_index: u32,
    }

    struct Vertex {
        @builtin(position) stage_space_position: vec4f,
        @location(0) position: vec2f,
        @location(1) uvw: vec3f,
    }

    struct Fragment {
        @location(0) color: vec4f,
    }

    @group(0) @binding(0)
    var<uniform> stroke_attributes: StrokeAttributes;
    
    @group(0) @binding(1)
    var<storage, read> stroke_points: array<StrokePointsPair>;
    
    @group(1) @binding(0)
    var<uniform> view: View;

    @vertex
    fn vertex_main(input: InputVertex) -> Vertex {
        let max_point_index = i32(arrayLength(&stroke_points)) - 1;
        let index = i32(input.vertex_index >> 1u) - 1;
        let side  = input.vertex_index & 1u;
        var point = stroke_points[clamp(index, 0, max_point_index)];

        let left_right = point.right - point.left;
        let width = length(left_right);
        let u = select(select(-0.5, 0.0, index >= 0), 0.5, index >= max_point_index);
        let cap = u * vec2(left_right.y, -left_right.x);
        point.left += cap; 
        point.right += cap;

        let position = select(point.left, point.right, side == 1u);
        let clip_position = vec4(
            2.0 * position.x / view.width - 1.0, 
            1.0 - 2.0 * position.y / view.height,
            0.0,
            1.0
        );
        let uvw = width * vec3(u, select(-0.5, 0.5, side == 1u), 1.0); 
        return Vertex(clip_position, position, uvw);
    }

    @fragment
    fn fragment_main(input: Vertex) -> Fragment {
        let half_width = 0.5 * input.uvw.z;
        let sdf = length(input.uvw.xy) - half_width;
        let alpha = smoothstep(0.0, -2.0, sdf);
        return Fragment(vec4(stroke_attributes.color.rgb, stroke_attributes.color.a * alpha));
    }
`