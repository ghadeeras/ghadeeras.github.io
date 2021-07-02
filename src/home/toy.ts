import * as Djee from "../djee/all.js"
import { Context, ShaderType, TextureTarget } from "../djee/all.js"
import * as Gear from "../gear/all.js"

let vertexShaderCode: string
let fragmentShaderCode: string
let mySketch: HTMLImageElement

const square = [
    -1, +1,
    -1, -1,
    +1, +1,
    +1, -1
]

export function init() {
    window.onload = () => {
        mySketch = new Image()
        mySketch.src = "/MySketch.png"
        mySketch.onload = () => {
            Gear.load("/shaders", doInit,
                ["mandelbrot.vert", shader => vertexShaderCode = shader],
                ["home.frag", shader => fragmentShaderCode = shader]
            )
        }
    }
}

function doInit() {
    const context = Djee.Context.of("canvas")

    const vertexShader = context.shader(ShaderType.VertexShader, vertexShaderCode)
    const fragmentShader = context.shader(ShaderType.FragmentShader, fragmentShaderCode)
    const program = vertexShader.linkTo(fragmentShader)
    program.use()

    const texture = context.newTexture()
    TextureTarget.texture2D.setRGBAImage(texture, mySketch)

    const buffer = context.newBuffer()
    buffer.float32Data = square

    const effect = program.uniform("effect")
    effect.data = [0]

    const mousePos = program.uniform("mousePos")
    mousePos.data = [0x10000, 0x10000]

    const sampler = program.uniform("sampler")
    sampler.data = [texture.unit]

    context.gl.uniform1i(sampler.location, 0)

    const vertex = program.attribute("vertex")
    vertex.pointTo(buffer)

    draw(context)

    context.canvas.onmousemove = e => {
        mousePos.data = [
            (2 * e.offsetX - context.canvas.clientWidth) / context.canvas.clientWidth,
            (context.canvas.clientHeight - 2 * e.offsetY) / context.canvas.clientHeight
        ]
        draw(context)
    }
    context.canvas.onmouseleave = () => {
        mousePos.data = [0x10000, 0x10000]
        effect.data = [(effect.data[0] + 1) % 3]
        draw(context)
    }
}

function draw(context: Context) {
    const gl = context.gl
    gl.viewport(0, 0, context.canvas.width, context.canvas.height)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
