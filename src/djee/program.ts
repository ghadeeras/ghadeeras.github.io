module Djee {

    export class Program {

        private _context: Context;
        private _shaders: Shader[];
        private _program: WebGLProgram;

        get context() {
            return this._context;
        }

        get shaders() {
            return this._shaders;
        }

        get program() {
            return this._program;
        }

        constructor(context: Context, shaders: Shader[]) {
            this._context = context;
            this._shaders = shaders;
            this._program = this.makeProgram(context.gl, shaders);
        }

        private makeProgram(gl: WebGLRenderingContext, shaders: Shader[]) {
            var program = gl.createProgram();
            shaders.forEach(s => {
                gl.attachShader(program, s.shader);
            });
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw `Unable to initialize the shader program: ${gl.getProgramInfoLog(program)}`;
            }
            return program;
        }
        
        delete() {
            var gl = this._context.gl;
            this._shaders.forEach(shader => gl.detachShader(this._program, shader.shader));
            gl.deleteProgram(this._program);
        }

        use() {
            this._context.gl.useProgram(this._program);
        }
        
        locateAttribute(name: string, size: number) {
            return new Attribute(this, name, size);
        }

        locateUniform(name: string, size: number) {
            return new Uniform(this, name, size);
        }

    }

}