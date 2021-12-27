import { aether, gear } from "/gen/libs.js"
import { wgl } from "../djee/index.js"
import { View } from "./view.js"

export class ViewGL implements View {

    private context: wgl.Context
    private uniformCenter: wgl.Uniform
    private uniformScale: wgl.Uniform
    private uniformColor: wgl.Uniform
    private uniformIntensity: wgl.Uniform
    private uniformPalette: wgl.Uniform
    private uniformJuliaNumber: wgl.Uniform

    private drawCall: gear.DeferredComputation<void> = new gear.DeferredComputation(() => this.doDraw())

    constructor(
        private julia: boolean,
        _canvasId: string,
        _vertexShaderCode: string,
        _fragmentShaderCode: string,
        _center: aether.Vec<2> = [-0.75, 0],
        _scale = 2.0
    ) {
        this.context = wgl.Context.of(_canvasId)

        const program = this.context.link(
            this.context.vertexShader(_vertexShaderCode),
            this.context.fragmentShader(_fragmentShaderCode)
        )
        program.use()

        const buffer = this.context.newAttributesBuffer()
        buffer.float32Data = [
            -1, -1, 
            +1, -1, 
            -1, +1,
            +1, +1, 
        ]

        const vertex = program.attribute("vertex")
        vertex.pointTo(buffer)

        this.uniformColor = program.uniform("color")
        this.uniformIntensity = program.uniform("intensity")
        this.uniformPalette = program.uniform("palette")
        this.uniformCenter = program.uniform("center")
        this.uniformScale = program.uniform("scale")
        this.uniformJuliaNumber = program.uniform("juliaNumber")

        this.hue = 5 / 4
        this.saturation = Math.sqrt(2) / 2
        this.intensity = 0.5
        this.palette = 0
        this.center = _center
        this.scale = _scale
        this.juliaNumber = [0, 0]
    }

    get center() {
        return [this.uniformCenter.data[0], this.uniformCenter.data[1]]
    }

    set center(c: aether.Vec<2>) {
        this.uniformCenter.data = c
        this.draw()
    }

    get scale() {
        return this.uniformScale.data[0]
    }

    set scale(s: number) {
        this.uniformScale.data = [s]
        this.draw()
    }

    get hue() {
        return this.uniformColor.data[0]
    }

    set hue(h: number) {
        this.setColor(h, this.saturation)
    }

    get saturation() {
        return this.uniformColor.data[1]
    }
    
    set saturation(s: number) {
        this.setColor(this.hue, s)
    }

    setColor(h: number, s: number) {
        this.uniformColor.data = [h, s]
        this.draw()
    }

    get intensity() {
        return this.uniformIntensity.data[0]
    }
    
    set intensity(i: number) {
        this.uniformIntensity.data = [i]
        this.draw()
    }

    get palette() {
        return this.uniformPalette.data[0] 
    }
    
    set palette(p: number) {
        this.uniformPalette.data = [p]
        this.draw()
    }

    get juliaNumber() {
        return [this.uniformJuliaNumber.data[0], this.uniformJuliaNumber.data[1]]
    }
    
    set juliaNumber(j: aether.Vec<2>) {
        this.uniformJuliaNumber.data = [...j, this.julia ? 1 : 0]
        this.draw()
    }
    
    private draw() {
        this.drawCall.perform();
    }
    
    private doDraw() {
        const gl = this.context.gl
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

} 

export async function viewGL(julia: boolean, canvasId: string, center: aether.Vec<2>, scale: number): Promise<View> {
    const shaders = await gear.fetchTextFiles({ 
        vertexShaderCode: "mandelbrot.vert", 
        fragmentShaderCode: "mandelbrot.frag"
    }, "/shaders")
    return new ViewGL(julia, canvasId, shaders.vertexShaderCode, shaders.fragmentShaderCode, center, scale)
}
