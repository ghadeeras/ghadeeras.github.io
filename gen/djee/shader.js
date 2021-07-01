import { failure } from "./utils.js";
export class Shader {
    constructor(context, type, code, reusable = false) {
        this.context = context;
        this.type = type;
        this.code = code;
        this.reusable = reusable;
        this.glShader = makeShader(context, type, code);
    }
    static fromElement(context, scriptElementId) {
        const scriptElement = getScriptElement(scriptElementId);
        const type = getShaderType(scriptElement);
        const code = scriptElement.innerHTML;
        return new Shader(context, type, code);
    }
    delete() {
        this.context.gl.deleteShader(this.glShader);
    }
    linkTo(...shaders) {
        return this.context.link(this, ...shaders);
    }
}
export var ShaderType;
(function (ShaderType) {
    ShaderType[ShaderType["VertexShader"] = WebGLRenderingContext.VERTEX_SHADER] = "VertexShader";
    ShaderType[ShaderType["FragmentShader"] = WebGLRenderingContext.FRAGMENT_SHADER] = "FragmentShader";
})(ShaderType || (ShaderType = {}));
function getScriptElement(scriptElementId) {
    const scriptElement = document.getElementById(scriptElementId);
    return scriptElement !== null && scriptElement !== void 0 ? scriptElement : failure(`No script found with ID: ${scriptElementId}`);
}
function getShaderType(script) {
    var _a;
    const type = (_a = script.getAttribute('type')) !== null && _a !== void 0 ? _a : "x-shader/x-vertex";
    switch (type) {
        case "x-shader/x-vertex": return ShaderType.VertexShader;
        case "x-shader/x-fragment": return ShaderType.FragmentShader;
        default: return failure(`Unknown shader type for script type: ${type}`);
    }
}
function makeShader(context, type, code) {
    const gl = context.gl;
    const shader = gl.createShader(type);
    if (!shader) {
        return failure(`Failed to create GL shader in context: ${context.canvas.id}`);
    }
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const logs = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        return failure(`Error compiling shader: ${logs}`);
    }
    return shader;
}
//# sourceMappingURL=shader.js.map