var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether, gear } from "/gen/libs.js";
import { wgl } from "../djee/index.js";
export class GLPicker {
    constructor(mainView, vertexShader, fragmentShader, vertices) {
        this.mainView = mainView;
        this.vertices = vertices;
        const context = mainView.context;
        this.program = context.link(context.shader(wgl.ShaderType.VertexShader, vertexShader), context.shader(wgl.ShaderType.FragmentShader, fragmentShader));
        this.program.use();
        this.posAttribute = this.program.attribute("aModelPos");
        this.mvpMatrixUniform = this.program.uniform("mvpMat");
        const canvas = context.canvas;
        const colorTexture = context.newTexture2D();
        colorTexture.setRawImage({
            format: WebGL2RenderingContext.RGBA,
            width: canvas.width,
            height: canvas.height
        });
        this.frameBuffer = context.newFrameBuffer();
        this.frameBuffer.colorBuffer = colorTexture;
        this.frameBuffer.depthBuffer = context.newRenderBuffer(WebGL2RenderingContext.DEPTH_COMPONENT16, canvas.width, canvas.height);
        this.unbind();
    }
    bind() {
        const gl = this.mainView.context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 0);
        gl.clearDepth(1);
        this.program.use();
        this.frameBuffer.bind();
    }
    unbind() {
        this.frameBuffer.unbind();
        this.mainView.bind();
    }
    pick(matModelViewProjection, x, y) {
        return __awaiter(this, void 0, void 0, function* () {
            this.bind();
            this.mvpMatrixUniform.data = new Float32Array(aether.mat4.columnMajorArray(matModelViewProjection));
            this.posAttribute.pointTo(this.vertices());
            const context = this.mainView.context;
            context.gl.clear(WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            context.gl.drawArrays(WebGL2RenderingContext.TRIANGLES, 0, this.vertices().count);
            const coordinatesAsColor = new Uint8Array(4);
            context.gl.readPixels(context.canvas.width * (x + 1) / 2, context.canvas.height * (y + 1) / 2, 1, 1, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE, coordinatesAsColor);
            this.unbind();
            return Promise.resolve(aether.vec4.sub(aether.vec4.scale(aether.vec4.from(coordinatesAsColor), 2 / 255), [1, 1, 1, 1]));
        });
    }
}
export function picker(mainView, vertices) {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield gear.fetchTextFiles({
            vertexShader: "picker.vert",
            fragmentShader: "picker.frag"
        }, "/shaders");
        return new GLPicker(mainView, shaders.vertexShader, shaders.fragmentShader, vertices);
    });
}
//# sourceMappingURL=picker.gl.js.map