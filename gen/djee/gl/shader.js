import { failure } from "../utils.js";
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
    ShaderType[ShaderType["VertexShader"] = WebGL2RenderingContext.VERTEX_SHADER] = "VertexShader";
    ShaderType[ShaderType["FragmentShader"] = WebGL2RenderingContext.FRAGMENT_SHADER] = "FragmentShader";
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
export const vertexShaders = {
    fullScreenPass: `#version 300 es

        precision highp float;
        
        out vec2 _position;
        
        const vec2[3] triangle = vec2[] (
            vec2(-1.0, -1.0),
            vec2( 3.0, -1.0),
            vec2(-1.0,  3.0)
        );
        
        void main() {
            _position = triangle[gl_VertexID];
            gl_Position = vec4(_position, 0.0, 1);
        }    
    `
};
export const fragmentShaders = {
    fullScreenPass: (shader) => `#version 300 es

        #ifdef GL_ES
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        #endif
        
        in vec2 _position;
        out vec4 _fragColor;

        ${shader}

        void main() {
            float pixelSizeX = dFdx(_position.x); 
            float pixelSizeY = dFdy(_position.y); 
            float aspect = pixelSizeY / pixelSizeX;
            vec2 position = aspect >= 1.0
                ? vec2(_position.x * aspect, _position.y)
                : vec2(_position.x, _position.y / aspect);
            _fragColor = colorAt(position, aspect, aspect >= 1.0 ? pixelSizeY : pixelSizeX);
        }
    `
};
//# sourceMappingURL=shader.js.map