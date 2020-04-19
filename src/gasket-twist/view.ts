module GasketTwist2 {

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
    
    function round(value: number) {
        return Math.round(1000 * value) / 1000;
    }

    export class View {
        
        private readonly context: Djee.Context;
        private readonly vertexShader: Djee.Shader;
        private readonly fragmentShader: Djee.Shader;
        private readonly program: Djee.Program;

        private readonly shaderPosition: Djee.Attribute;
        private readonly shaderTwist: Djee.Uniform;
        private readonly shaderScale: Djee.Uniform;
        private readonly cornersBuffer: Djee.Buffer;
        private readonly centersBuffer: Djee.Buffer;

        private mustShowCorners: boolean;
        private mustShowCenters: boolean;
        private stride: number;

        readonly sierpinsky: Gear.Sink<FlattenedSierpinski>;
        readonly showCorners: Gear.Sink<boolean>;
        readonly showCenters: Gear.Sink<boolean>;
        readonly depth: Gear.Sink<number>;
        readonly twist: Gear.Sink<number>;
        readonly scale: Gear.Sink<number>;        

        constructor(
            canvasId: string, 
            depthId: string, 
            twistId: string, 
            scaleId: string,
        ) {
            this.context = new Djee.Context(canvasId);

            this.vertexShader = this.context.shader(ST.VertexShader, vertexShader);
            this.fragmentShader = this.context.shader(ST.FragmentShader, fragmentShader);
            this.program = this.context.link([this.vertexShader, this.fragmentShader]);
            this.program.use();

            this.shaderPosition = this.program.locateAttribute("vPosition", 2);
            this.shaderTwist = this.program.locateUniform("twist", 1);
            this.shaderScale = this.program.locateUniform("scale", 1);

            this.cornersBuffer = this.context.newBuffer();
            this.centersBuffer = this.context.newBuffer();

            this.context.gl.clearColor(1, 1, 1, 1);

            this.sierpinsky = Gear.sink(s => this.setSierpinski(s));
            this.depth = Gear.sinkFlow(flow => flow.defaultsTo(5).map(v => v + "").to(Gear.text(depthId)));
            this.twist = Gear.sinkFlow(flow => flow.defaultsTo(0).branch(flow => flow.to(Gear.sink(t => this.setTwist(t)))).map(v => v + "").to(Gear.text(twistId)));
            this.scale = Gear.sinkFlow(flow => flow.defaultsTo(1).branch(flow => flow.to(Gear.sink(s => this.setScale(s)))).map(v => v + "").to(Gear.text(scaleId)));
            this.showCorners = Gear.sink(show => this.setShowCorners(show));
            this.showCenters = Gear.sink(show => this.setShowCenters(show));
        }

        private source<T>(value: T): Gear.Value<T> {
            return new Gear.Value(value);
        }

        private setSierpinski(flattenedSierpinski: FlattenedSierpinski) {
            this.cornersBuffer.data = flattenedSierpinski.corners;
            this.centersBuffer.data = flattenedSierpinski.centers;
            this.stride = flattenedSierpinski.stride;
            this.draw();
        }
        
        private setTwist(twist: number) {
            this.shaderTwist.data = [twist];
            this.draw();
        }

        private setScale(scale: number) {
            this.shaderScale.data = [scale];
            this.draw();
        }

        private setShowCorners(showCorners: boolean) {
            this.mustShowCorners = showCorners
            this.draw()
        }

        private setShowCenters(showCenters: boolean) {
            this.mustShowCenters = showCenters
            this.draw()
        }

        private draw() {
            setTimeout(() => {
                var gl = this.context.gl;
                gl.clear(gl.COLOR_BUFFER_BIT);
    
                if (this.mustShowCorners) {
                    this.shaderPosition.pointTo(this.cornersBuffer);
                    gl.drawArrays(gl.TRIANGLES, 0, this.cornersBuffer.data.length / this.stride);
                }
    
                if (this.mustShowCenters) {
                    this.shaderPosition.pointTo(this.centersBuffer);
                    gl.drawArrays(gl.TRIANGLES, 0, this.centersBuffer.data.length / this.stride);
                }
            });
        }

    }

}