module Djee {

    export class Context {

        readonly canvas: HTMLCanvasElement;
        readonly gl: WebGLRenderingContext;

        constructor(canvasId: string) {
            this.canvas = this.getCanvas(canvasId);
            this.gl = this.getContext(this.canvas);
        }

        private getCanvas(canvasId: string) {
            const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
            if (!canvas) {
                throw `No canvas found with ID: ${canvasId}`;
            }
            return canvas;
        }

        private getContext(canvas: HTMLCanvasElement) {
            const gl: WebGLRenderingContext = this.doGetContext(canvas);
            if (!gl) {
                throw "Your browser seems not to support WebGL!";
            }
            return gl;
        }

        private doGetContext(canvas: HTMLCanvasElement) {
            try {
                return canvas.getContext("webgl") || canvas.getContext("experimental-webgl") as WebGLRenderingContext;
            } catch (e) {
                console.error(e);
                return null;
            }
        }

        with<T>(glCode: (gl: WebGLRenderingContext) => T) {
            return glCode(this.gl);
        }

        shaderFromElement(scriptId: string) {
            return Shader.fromElement(this, scriptId);
        }

        shader(type: ShaderType, code: string) {
            return new Shader(this, type, code);
        }

        linkFromElements(scriptIds: string[]) {
            const shaders = scriptIds.map(id => this.shaderFromElement(id));
            return this.link(shaders);
        }
        
        link(shaders: Shader[]) {
            return new Program(this, shaders);
        }

        newBuffer() {
            return new Buffer(this);
        }

    }

}