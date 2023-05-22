import { aether, gear } from "/gen/libs.js"
import { wgl } from "../djee/index.js"
import { View } from "./view.js"

export class ViewGL implements View {

    private context: wgl.Context
    private uniformCenter: wgl.Uniform
    private uniformScale: wgl.Uniform
    private uniformColor: wgl.Uniform
    private uniformIntensity: wgl.Uniform
    private uniformXray: wgl.Uniform
    private uniformCrosshairs: wgl.Uniform

    constructor(
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

        this.uniformColor = program.uniform("color")
        this.uniformIntensity = program.uniform("intensity")
        this.uniformCenter = program.uniform("center")
        this.uniformScale = program.uniform("scale")
        this.uniformXray = program.uniform("xray")
        this.uniformCrosshairs = program.uniform("crosshairs")

        this.hue = 5 / 4
        this.saturation = Math.sqrt(2) / 2
        this.intensity = 0.5
        this.xray = false
        this.crosshairs = true
        this.center = _center
        this.scale = _scale
    }

    get canvas() {
        return this.context.canvas
    }

    get center() {
        return [this.uniformCenter.data[0], this.uniformCenter.data[1]]
    }

    set center(c: aether.Vec<2>) {
        this.uniformCenter.data = c
    }

    get scale() {
        return this.uniformScale.data[0]
    }

    set scale(s: number) {
        this.uniformScale.data = [s]
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
    }

    get intensity() {
        return this.uniformIntensity.data[0]
    }
    
    set intensity(i: number) {
        this.uniformIntensity.data = [i]
    }

    get xray() {
        return this.uniformXray.data[0] != 0 
    }
    
    set xray(b: boolean) {
        this.uniformXray.data = [b ? 1 : 0]
    }

    get crosshairs() {
        return this.uniformCrosshairs.data[0] != 0 
    }
    
    set crosshairs(b: boolean) {
        this.uniformCrosshairs.data = [b ? 1 : 0]
    }

    resize() {
        this.context.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    }

    render() {
        const gl = this.context.gl
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3)
    }

} 

export async function viewGL(canvasId: string, center: aether.Vec<2>, scale: number): Promise<View> {
    const shader = await gear.fetchTextFile("/shaders/mandelbrot.frag")
    const vertexShader = wgl.vertexShaders.fullScreenPass
    const fragmentShader = wgl.fragmentShaders.fullScreenPass(shader)
    return new ViewGL(canvasId, vertexShader, fragmentShader, center, scale)
}
