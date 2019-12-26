module Djee {

    export class Program {

        readonly program: WebGLProgram;

        constructor(readonly context: Context, readonly shaders: Shader[]) {
            this.program = this.makeProgram(context.gl, shaders);
        }

        private makeProgram(gl: WebGLRenderingContext, shaders: Shader[]) {
            const program = gl.createProgram();
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
            const gl = this.context.gl;
            this.shaders.forEach(shader => gl.detachShader(this.program, shader.shader));
            gl.deleteProgram(this.program);
        }

        use() {
            this.context.gl.useProgram(this.program);
        }
        
        locateAttribute(name: string, size: number) {
            return new Attribute(this, name, size);
        }

        locateUniform(name: string, size: number) {
            return new Uniform(this, name, size);
        }

    }

}