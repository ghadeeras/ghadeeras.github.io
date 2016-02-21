module Djee {

    export class Context {

        private _canvas: HTMLCanvasElement;
        private _gl: WebGLRenderingContext;

        get canvas() {
            return this._canvas;
        }

        get gl() {
            return this._gl;
        }

        constructor(canvasId: string) {
            this._canvas = this.getCanvas(canvasId);
            this._gl = this.getContext(this._canvas);
        }

        private getCanvas(canvasId: string) {
            var canvas = document.getElementById(canvasId) as HTMLCanvasElement;
            if (!canvas) {
                throw `No canvas found with ID: ${canvasId}`;
            }
            return canvas;
        }

        private getContext(canvas: HTMLCanvasElement) {
            var gl: WebGLRenderingContext;
            try {
                gl =
                    canvas.getContext("experimental-webgl") ||
                    canvas.getContext("webgl") as WebGLRenderingContext;
            } catch (e) {
                console.error(e);
                gl = null;
            }
            if (!gl) {
                throw "Your browser seems not to support WebGL!";
            }
            return gl;
        }

        with<T>(glCode: (gl: WebGLRenderingContext) => T) {
            return glCode(this._gl);
        }

        shaderFromElement(scriptId: string) {
            return Shader.fromElement(this, scriptId);
        }

        shader(type: ShaderType, code: string) {
            return new Shader(this, type, code);
        }

        linkFromElements(scriptIds: string[]) {
            var shaders = scriptIds.map(id => this.shaderFromElement(id));
            return new Program(this, shaders);
        }
        
        link(shaders: Shader[]) {
            return new Program(this, shaders);
        }

        newBuffer() {
            return new Buffer(this);
        }

    }

}