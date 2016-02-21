module GasketTwist {

    var vertexShader = `
      attribute vec2 vPosition;
      
      uniform float twist;
      uniform float scale;
      
      void main() {
        vec2 p = scale * vPosition;
        float angle = twist * length(p);
        float s = sin(angle);
        float c = cos(angle);
        mat2 rotation = mat2(vec2(c, s), vec2(-s, c));
        gl_Position = vec4(rotation * p, 0.0, 1.0);
      }
    `;

    var fragmentShader = `
      precision mediump float;
      
      void main() {
        gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
      }
    `

    var ST = Djee.ShaderType;

    export class View {
        
        private _depthDiv: HTMLElement;
        private _twistDiv: HTMLElement;
        private _scaleDiv: HTMLElement;
        
        private _context: Djee.Context;
        private _vertexShader: Djee.Shader;
        private _fragmentShader: Djee.Shader;
        private _program: Djee.Program;

        private _position: Djee.Attribute;
        private _twist: Djee.Uniform;
        private _scale: Djee.Uniform;

        private _cornersBuffer: Djee.Buffer;
        private _centersBuffer: Djee.Buffer;

        private _inArrays = new Gear.Sensor<FlattenedSierpinski>(arrays => this.sierpinski = arrays);
        private _inTwist = new Gear.Sensor<number>(twist => {
            this.twist = twist;
            this._twistDiv.innerText = twist.toString();
        });
        private _inScale = new Gear.Sensor<number>(scale => {
            this.scale = scale;
            this._scaleDiv.innerText = scale.toString();
        });
        private _inShowCorners = new Gear.Sensor<boolean>(showCorners => this._rendering.later());
        private _inShowCenters = new Gear.Sensor<boolean>(showCenters => this._rendering.later());
        private _inDepth = new Gear.Sensor<number>(depth => this._depthDiv.innerText = depth.toString());
        
        private _rendering = new Gear.Call(() => this.draw());
        
        get inArrays() {
            return this._inArrays; 
        }

        get inTwist() {
            return this._inTwist; 
        }

        get inScale() {
            return this._inScale; 
        }

        get inShowCorners() {
            return this._inShowCorners; 
        }

        get inShowCenters() {
            return this._inShowCenters; 
        }
        
        get inDepth() {
            return this._inDepth;
        }

        constructor(canvasId: string, depthId: string, twistId: string, scaleId: string) {
            this._depthDiv = document.getElementById(depthId);
            this._twistDiv = document.getElementById(twistId);
            this._scaleDiv = document.getElementById(scaleId);
            this._context = new Djee.Context(canvasId);
            var context = this._context;

            this._vertexShader = context.shader(ST.VertexShader, vertexShader);
            this._fragmentShader = context.shader(ST.FragmentShader, fragmentShader);
            this._program = context.link([this._vertexShader, this._fragmentShader]);
            this._program.use();

            this._position = this._program.locateAttribute("vPosition", 2);
            this._twist = this._program.locateUniform("twist", 1);
            this._scale = this._program.locateUniform("scale", 1);

            this._cornersBuffer = context.newBuffer();
            this._centersBuffer = context.newBuffer();

            context.gl.clearColor(1, 1, 1, 1);
        }

        private set sierpinski(flattenedSierpinski: FlattenedSierpinski) {
            this._cornersBuffer.data = flattenedSierpinski.corners;
            this._centersBuffer.data = flattenedSierpinski.centers;
            this._rendering.later();
        }
        
        private set twist(twist: number) {
            this._twist.data = [twist];
            this._rendering.later();
        }

        private set scale(scale: number) {
            this._scale.data = [scale];
            this._rendering.later();
        }

        private draw() {
            var gl = this._context.gl;
            gl.clear(gl.COLOR_BUFFER_BIT);

            if (this._inShowCorners.reading) {
                this._position.pointTo(this._cornersBuffer);
                gl.drawArrays(gl.TRIANGLES, 0, this._cornersBuffer.data.length / 2);
            }

            if (this._inShowCenters.reading) {
                this._position.pointTo(this._centersBuffer);
                gl.drawArrays(gl.TRIANGLES, 0, this._centersBuffer.data.length / 2);
            }
        }

    }

}