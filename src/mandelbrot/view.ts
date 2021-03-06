import * as Space from "../space/all.js"
import * as Djee from "../djee/all.js"
import * as Gear from "../gear/all.js"

export class View {

    private context: Djee.Context
    private uniformCenter: Djee.Uniform
    private uniformScale: Djee.Uniform
    private uniformColor: Djee.Uniform
    private uniformIntensity: Djee.Uniform
    private uniformPalette: Djee.Uniform
    private uniformJuliaNumber: Djee.Uniform

    private drawCall: Gear.Call = new Gear.Call(() => this.doDraw())

    constructor(
        private julia: boolean,
        _canvasId: string,
        _vertexShaderCode: string,
        _fragmentShaderCode: string,
        _center = Space.vec(-0.75, 0),
        _scale = 2.0
    ) {
        this.context = Djee.Context.of(_canvasId)

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
        this.juliaNumber = Space.vec(0, 0, 0)
    }

    get center() {
        return Space.vec(...this.uniformCenter.data)
    }

    set center(c: Space.Vector) {
        this.uniformCenter.data = c.coordinates
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
        return Space.vec(...this.uniformJuliaNumber.data)
    }
    
    set juliaNumber(j: Space.Vector) {
        this.uniformJuliaNumber.data = [...j.swizzle(0, 1).coordinates, this.julia ? 1 : 0]
        this.draw()
    }
    
    private draw() {
        this.drawCall.later();
    }
    
    private doDraw() {
        const gl = this.context.gl
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

} 
