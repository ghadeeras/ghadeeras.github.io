import * as Djee from "../djee/all.js"
import { Context, ShaderType, TextureTarget } from "../djee/all.js"
import * as Gear from "../gear/all.js"

let vertexShaderCode: string
let fragmentShaderCode: string

const mySketch = new Image()
const fileReader = new FileReader()

const square = [
    -1, +1,
    -1, -1,
    +1, +1,
    +1, -1
]

export function init() {
    window.onload = () => {
        Gear.load("/shaders", doInit,
            ["mandelbrot.vert", shader => vertexShaderCode = shader],
            ["home.frag", shader => fragmentShaderCode = shader]
        )
    }
}

function doInit() {
    const context = Djee.Context.of("canvas")

    const vertexShader = context.shader(ShaderType.VertexShader, vertexShaderCode)
    const fragmentShader = context.shader(ShaderType.FragmentShader, fragmentShaderCode)
    const program = vertexShader.linkTo(fragmentShader)
    program.use()

    const texture = context.newTexture()
    TextureTarget.texture2D.setImage(texture, {
        format: WebGLRenderingContext.RGBA,
        width: 2,
        height: 2,
        pixels: new Uint8Array([
            0xFF, 0x00, 0x00, 0xFF, 0x00, 0x00, 0xFF, 0xFF,
            0x00, 0x00, 0xFF, 0xFF, 0x00, 0xFF, 0x00, 0xFF
        ])
    })

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

    mySketch.onload = () => updateTexture(texture)
    mySketch.src = "/MySketch.png"

    context.canvas.onpointermove = event => distortImage(event, mousePos)
    context.canvas.ontouchmove = event => event.preventDefault()
    context.canvas.onpointerleave = () => restoreImage(mousePos, effect)
    context.canvas.ondragover = event => tearImage(event, mousePos, effect)
    context.canvas.ondrop = event => loadImage(event, effect)
}

async function updateTexture(texture: Djee.Texture) {
    const context = texture.context
    const canvas = context.canvas
    const image = await createImageBitmap(mySketch, 0, 0, mySketch.naturalWidth, mySketch.naturalHeight, {
        resizeWidth: canvas.width,
        resizeHeight: canvas.height
    })
    TextureTarget.texture2D.setRGBAImage(texture, image)
    draw(context)
}

function distortImage(e: PointerEvent, mousePos: Djee.Uniform) {
    e.preventDefault()
    mousePos.data = normalizePosition(e)
    draw(mousePos.program.context)
}

function restoreImage(mousePos: Djee.Uniform, effect: Djee.Uniform) {
    mousePos.data = [0x10000, 0x10000]
    effect.data = [(effect.data[0] + 1) % 3]
    draw(mousePos.program.context)
}

function tearImage(e: DragEvent, mousePos: Djee.Uniform, effect: Djee.Uniform) {
    e.preventDefault()
    mousePos.data = normalizePosition(e)
    if (effect.data[0] < 3) {
        effect.data = [effect.data[0] + 3]
    }
    draw(mousePos.program.context)
}

async function loadImage(e: DragEvent, effect: Djee.Uniform) {
    e.preventDefault()
    effect.data = [effect.data[0] - 3]
    if (e.dataTransfer) {
        const file = e.dataTransfer.files[0]
        mySketch.src = await readAsDataURL(file)
    }
}

function readAsDataURL(file: File) {
    const promise = new Promise<string>((resolve, reject) => {
        fileReader.onloadend = () => {
            if (fileReader.result != null && typeof fileReader.result == 'string') {
                resolve(fileReader.result)
            } else {
                reject(new Error(`Expected file reading to return a URL string, instead got: ${fileReader.result}`))
            }
        }
        fileReader.onabort = () => reject(new Error("File reading aborted!"))
        fileReader.onerror = () => reject(fileReader.error)
    })
    fileReader.readAsDataURL(file)
    return promise
}

function normalizePosition(e: PointerEvent | DragEvent): number[] {
    const canvas = e.target as HTMLElement
    return [
        (2 * e.offsetX - canvas.clientWidth) / canvas.clientWidth,
        (canvas.clientHeight - 2 * e.offsetY) / canvas.clientHeight
    ]
}

function draw(context: Context) {
    const gl = context.gl
    gl.viewport(0, 0, context.canvas.width, context.canvas.height)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}
