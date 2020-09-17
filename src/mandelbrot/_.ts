module Mandelbrot {

    let mouseBindingElement: HTMLInputElement
    let canvas: Gear.ElementEvents

    let vertexShaderCode: string
    let fragmentShaderCode: string

    let context: Djee.Context
    let uniformCenter: Djee.Uniform
    let uniformScale: Djee.Uniform
    let uniformColor: Djee.Uniform
    let uniformIntensity: Djee.Uniform
    let uniformPalette: Djee.Uniform

    let center = Space.vec(-0.75, 0)
    let scale = 2.0

    export function init() {
        window.onload = () => Gear.load("/shaders", () => Space.initWaModules(() => doInit()),
            ["mandelbrot.vert", shader => vertexShaderCode = shader],
            ["mandelbrot.frag", shader => fragmentShaderCode = shader]
        )
    }

    function doInit() {
        mouseBindingElement = document.getElementById("mouse-binding") as HTMLInputElement;
        mouseBindingElement.onkeypress = e => {
            e.preventDefault()
        }
        window.onkeypress = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase()
            const act = action(key)
            if (act != null) {
                mouseBindingElement.value = act;
            }
        }

        context = new Djee.Context("canvas-gl")

        const program = context.link([
            context.vertexShader(vertexShaderCode),
            context.fragmentShader(fragmentShaderCode)
        ])
        program.use()

        const buffer = context.newBuffer()
        buffer.untypedData = [
            -1, -1, 
            +1, -1, 
            -1, +1,
            +1, +1, 
        ]

        const vertex = program.locateAttribute("vertex", 2)
        vertex.pointTo(buffer)

        uniformColor = program.locateUniform("color", 2)
        uniformColor.data = [5 / 4, Math.sqrt(2) / 2]

        uniformIntensity = program.locateUniform("intensity", 1)
        uniformIntensity.data = [0.5]

        uniformPalette = program.locateUniform("palette", 1)
        uniformPalette.data = [0]

        uniformCenter = program.locateUniform("center", 2)
        uniformCenter.data = center.coordinates

        uniformScale = program.locateUniform("scale", 1)
        uniformScale.data = [scale]

        canvas = Gear.ElementEvents.create("canvas-gl")
        canvas.dragging.branch(
            flow => flow.filter(selected("move")).producer(d => move(d)),
            flow => flow.filter(selected("zoom")).producer(d => zoom(d)),
            flow => flow.filter(selected("color")).producer(d => colorize(d)),
            flow => flow.filter(selected("intensity")).producer(d => intensity(d)),
            flow => flow.filter(selected("palette")).producer(d => palette(d)),
        )

        draw()
    }

    function action(key: string) {
        switch (key.toUpperCase()) {
            case "M": return "move"
            case "Z": return "zoom"
            case "C": return "color"
            case "I": return "intensity"
            case "P": return "palette"
            default: return null
        }
    }

    function selected(value: string): Gear.Predicate<Gear.Dragging> {
        return () => mouseBindingElement.value == value;
    }

    function zoom(dragging: Gear.Dragging) {
        const delta = calculateDelta(dragging.startPos, dragging.pos)
        const power = -delta.coordinates[1]
        if (power != 0) {
            const centerToStart = calculateDelta(canvas.center, dragging.startPos, scale)
            const factor = 16 ** power
            const newScale = scale * factor
            const newCenter = center.plus(centerToStart.scale(1 - factor))
            if (dragging.end) {
                scale = newScale
                center = newCenter
            }
            uniformScale.data = [newScale]
            uniformCenter.data = newCenter.coordinates
            draw()
        }
    }

    function move(dragging: Gear.Dragging) {
        const delta = calculateDelta(dragging.startPos, dragging.pos, scale)
        if (delta.length > 0) {
            const newCenter = center.minus(delta)
                .combine(Space.vec(+4, +4), Math.min)
                .combine(Space.vec(-4, -4), Math.max)
            if (dragging.end) {
                center = newCenter
            }
            uniformCenter.data = newCenter.coordinates
            draw()
        }
    }

    function colorize(dragging: Gear.Dragging) {
        const hue = 2 * dragging.pos[0] / canvas.element.clientWidth
        const saturation = 1 - dragging.pos[1] / canvas.element.clientHeight
        uniformColor.data = [hue, saturation]
        draw()
    }
    
    function intensity(dragging: Gear.Dragging) {
        const intensity = 1 - dragging.pos[1] / canvas.element.clientWidth
        uniformIntensity.data = [intensity]
        draw()
    }
    
    function palette(dragging: Gear.Dragging) {
        const palette = 1.5 - 2 * dragging.pos[1] / canvas.element.clientWidth
        uniformPalette.data = [palette > 1 ? 1 : palette < 0 ? 0 : palette]
        draw()
    }
    
    function calculateDelta(pos1: Gear.PointerPosition, pos2: Gear.PointerPosition, scale: number = 1) {
        return Space.vec(...pos2)
            .minus(Space.vec(...pos1))
            .scale(2 * scale)
            .divide(Space.vec(canvas.element.clientWidth, -canvas.element.clientHeight))
    }

    function draw() {
        const gl = context.gl
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

}