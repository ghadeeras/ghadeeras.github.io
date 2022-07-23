import { gear } from "/gen/libs.js"
import { wgl } from "../djee/index.js"
import { required } from "../utils/misc.js"

const mySketch = new Image()

const square = [
    -1, +1,
    -1, -1,
    +1, +1,
    +1, -1
]

export async function init() {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "mandelbrot.vert",
        fragmentShaderCode: "home.frag"
    }, "/shaders")

    const context = wgl.Context.of("canvas")

    const vertexShader = context.shader(wgl.ShaderType.VertexShader, shaders.vertexShaderCode)
    const fragmentShader = context.shader(wgl.ShaderType.FragmentShader, shaders.fragmentShaderCode)
    const program = vertexShader.linkTo(fragmentShader)
    program.use()

    const texture = context.newTexture2D()
    texture.setRawImage({
        format: WebGL2RenderingContext.RGBA,
        width: 2,
        height: 2,
        pixels: new Uint8Array([
            0xFF, 0x00, 0x00, 0xFF, 0x00, 0x00, 0xFF, 0xFF,
            0x00, 0x00, 0xFF, 0xFF, 0x00, 0xFF, 0x00, 0xFF
        ])
    })

    const buffer = context.newAttributesBuffer()
    buffer.float32Data = square

    const effect = program.uniform("effect")
    effect.data = [0]

    const mousePos = program.uniform("mousePos")
    mousePos.data = [0x10000, 0x10000]

    const sampler = program.uniform("sampler")
    sampler.data = [texture.unit]

    const vertex = program.attribute("vertex")
    vertex.pointTo(buffer)

    draw(context)

    mySketch.onload = () => updateTexture(texture)
    mySketch.src = "/MySketch.png"

    context.canvas.ontouchmove = event => event.preventDefault()
    context.canvas.onpointermove = event => distortImage(event, mousePos)
    context.canvas.onpointerleave = () => restoreImage(mousePos, effect)
    context.canvas.onclick = event => useCurrentImage(event, mousePos, texture)
    context.canvas.ondblclick = event => restoreOriginalImage(event, texture)
    context.canvas.ondragover = event => tearImage(event, mousePos, effect)
    context.canvas.ondrop = event => loadImage(event, effect)
}

function draw(context: wgl.Context) {
    const gl = context.gl
    gl.viewport(0, 0, context.canvas.width, context.canvas.height)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.flush()
}

async function updateTexture(texture: wgl.Texture2D) {
    const context = texture.context
    const canvas = context.canvas
    const image = await createImageBitmap(mySketch, 0, 0, mySketch.naturalWidth, mySketch.naturalHeight, {
        resizeWidth: canvas.width,
        resizeHeight: canvas.height
    })
    texture.setImageSource(image)
    draw(context)
}

async function useCurrentImage(e: PointerEvent | MouseEvent, mousePos: wgl.Uniform, texture: wgl.Texture2D) {
    distortImage(e, mousePos)
    const image = await createImageBitmap(texture.context.canvas, 0, 0, mySketch.naturalWidth, mySketch.naturalHeight)
    texture.setImageSource(image)
}

function distortImage(e: PointerEvent | MouseEvent, mousePos: wgl.Uniform) {
    e.preventDefault()
    mousePos.data = normalizePosition(e)
    draw(mousePos.program.context)
}

function restoreImage(mousePos: wgl.Uniform, effect: wgl.Uniform) {
    mousePos.data = [0x10000, 0x10000]
    effect.data = [(effect.data[0] + 1) % 3]
    draw(mousePos.program.context)
}

function restoreOriginalImage(e: MouseEvent,  texture: wgl.Texture2D) {
    e.preventDefault()
    updateTexture(texture)
}

function tearImage(e: DragEvent, mousePos: wgl.Uniform, effect: wgl.Uniform) {
    e.preventDefault()
    mousePos.data = normalizePosition(e)
    if (effect.data[0] < 3) {
        effect.data = [effect.data[0] + 3]
    }
    draw(mousePos.program.context)
}

function loadImage(e: DragEvent, effect: wgl.Uniform) {
    e.preventDefault()
    effect.data = [effect.data[0] - 3]
    if (e.dataTransfer) {
        const item = e.dataTransfer.items[0]
        if (item.kind == 'file') {
            const url = URL.createObjectURL(required(item.getAsFile()))
            mySketch.src = url
        } else {
            item.getAsString(url => {
                mySketch.crossOrigin = isCrossOrigin(url) ? "anonymous" : null
                mySketch.src = url
            })   
        }
    }
}

function isCrossOrigin(url: string) {
    const urlObj = new URL(url, window.location.href)
    const isCrossOrigin = urlObj.origin != window.location.origin
    return isCrossOrigin
}

function normalizePosition(e: PointerEvent | MouseEvent | DragEvent): number[] {
    const canvas = e.target as HTMLElement
    return [
        (2 * e.offsetX - canvas.clientWidth) / canvas.clientWidth,
        (canvas.clientHeight - 2 * e.offsetY) / canvas.clientHeight
    ]
}
