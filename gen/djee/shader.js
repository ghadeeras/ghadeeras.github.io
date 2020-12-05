export class Shader {
    constructor(context, type, code) {
        this.context = context;
        this.type = type;
        this.code = code;
        this.context = context;
        this.type = type;
        this.code = code;
        this.shader = this.makeShader(context.gl, type, code);
    }
    static fromElement(context, scriptId) {
        const script = this.getScript(scriptId);
        const type = this.getShaderType(script.getAttribute('type') || "x-shader/x-vertex");
        const code = script.innerHTML;
        return new Shader(context, type, code);
    }
    static getScript(scriptId) {
        const script = document.getElementById(scriptId);
        if (!script) {
            throw `No script found with ID: ${scriptId}`;
        }
        return script;
    }
    static getShaderType(type) {
        if (type == "x-shader/x-vertex") {
            return ShaderType.VertexShader;
        }
        else if (type == "x-shader/x-fragment") {
            return ShaderType.FragmentShader;
        }
        else {
            throw `Unknown shader type for script type: ${type}`;
        }
    }
    makeShader(gl, type, code) {
        var _a;
        const shader = (_a = gl.createShader(type)) !== null && _a !== void 0 ? _a : this.failure();
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw `Error compiling shader: ${gl.getShaderInfoLog(shader)}`;
        }
        return shader;
    }
    failure() {
        throw new Error("Failed to create GL shader in context: " + this.context.canvas.id);
    }
    delete() {
        this.context.gl.deleteShader(this.shader);
    }
}
export var ShaderType;
(function (ShaderType) {
    ShaderType[ShaderType["VertexShader"] = WebGLRenderingContext.VERTEX_SHADER] = "VertexShader";
    ShaderType[ShaderType["FragmentShader"] = WebGLRenderingContext.FRAGMENT_SHADER] = "FragmentShader";
})(ShaderType || (ShaderType = {}));
//# sourceMappingURL=shader.js.map