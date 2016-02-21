module Djee {

    export class Shader {

        private _context: Context;
        private _type: ShaderType;
        private _code: string;
        private _shader: WebGLShader;

        get context() {
            return this._context;
        }

        get type() {
            return this._type;
        }

        get code() {
            return this._code;
        }

        get shader() {
            return this._shader;
        }

        constructor(context: Context, type: ShaderType, code: string) {
            this._context = context;
            this._type = type;
            this._code = code;
            this._shader = this.makeShader(context.gl, type, code);
        }
        
        delete() {
            this._context.gl.deleteShader(this._shader);
        }

        static fromElement(context: Context, scriptId: string) {
            var script = this.getScript(scriptId);
            var type = this.getShaderType(script.getAttribute(type));
            var code = script.innerHTML;
            return new Shader(context, type, code);
        }

        private static getScript(scriptId: string) {
            var script = document.getElementById(scriptId);
            if (!script) {
                throw `No script found with ID: ${scriptId}`
            }
            return script;
        }

        private static getShaderType(type: string) {
            if (type == "x-shader/x-vertex") {
                return ShaderType.VertexShader;
            } else if (type == "x-shader/x-fragment") {
                return ShaderType.FragmentShader;
            } else {
                throw `Unknown shader type for script type: ${type}`;
            }
        }

        private makeShader(gl: WebGLRenderingContext, type: ShaderType, code: string) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, code);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw `Error compiling shader: ${gl.getShaderInfoLog(shader)}`;
            }
            return shader;
        }

    }

    export enum ShaderType {
        VertexShader = WebGLRenderingContext.VERTEX_SHADER,
        FragmentShader = WebGLRenderingContext.FRAGMENT_SHADER
    }

}