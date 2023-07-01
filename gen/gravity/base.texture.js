var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from '../djee/gpu/index.js';
class BaseTexture {
    constructor(appLayout, shader, target) {
        this.appLayout = appLayout;
        const device = shader.device;
        this.pipeline = device.device.createRenderPipeline({
            layout: appLayout.pipelineLayouts.texturePasting.wrapped,
            vertex: shader.vertexState("v_main", []),
            fragment: shader.fragmentState("f_main", [target]),
            primitive: {
                topology: "triangle-list"
            },
            label: "BaseTexturePipeline"
        });
        this.sampler = device.sampler();
    }
    rendererFor(texture) {
        const group = this.appLayout.groupLayouts.sampledTexture.instance("BaseTextureGroup", {
            textureSampler: this.sampler,
            baseTexture: texture.createView()
        });
        return new BaseTextureRenderer((encoder, attachment) => {
            const descriptor = { colorAttachments: [attachment] };
            encoder.renderPass(descriptor, pass => {
                pass.setPipeline(this.pipeline);
                pass.setBindGroup(0, group.wrapped);
                pass.draw(3);
            });
        });
    }
    static create(appLayout, target) {
        return __awaiter(this, void 0, void 0, function* () {
            const shader = yield appLayout.device.shaderModule("BaseTexture", BaseTexture.shaderCode);
            return new BaseTexture(appLayout, shader, target);
        });
    }
}
BaseTexture.shaderCode = gpu.renderingShaders.fullScreenPassVertex(/*wgsl*/ `
        
        @group(0) @binding(0)
        var textureSampler: sampler;

        @group(0) @binding(1)
        var baseTexture: texture_2d<f32>;

        @fragment
        fn f_main(varyings: Varyings) -> @location(0) vec4<f32> {
            let uv = 0.5 * vec2(1.0 + varyings.clipPosition.x, 1.0 - varyings.clipPosition.y);
            return textureSample(baseTexture, textureSampler, uv);
        }
    `);
export { BaseTexture };
export class BaseTextureRenderer {
    constructor(render) {
        this.render = render;
    }
}
//# sourceMappingURL=base.texture.js.map