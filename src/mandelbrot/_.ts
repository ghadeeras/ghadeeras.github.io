module Mandelbrot {

    const audioContext = new window.AudioContext({sampleRate: 8192})
    const audioBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate)

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

    let centerSpan: Gear.Sink<Space.Vector>
    let scaleSpan: Gear.Sink<number>
    let hueSpan: Gear.Sink<number>
    let saturationSpan: Gear.Sink<number>
    let intensitySpan: Gear.Sink<number>
    let paletteSpan: Gear.Sink<number>

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

        centerSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(center)
            .map(pos => pos.coordinates.map(c => c.toPrecision(3)))
            .map(pos => "(x: " + pos[0] + ", y: " + pos[1] + ")")
            .to(Gear.text("center"))
        )
        scaleSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(scale)
            .map(s => s.toPrecision(3).toString())
            .to(Gear.text("scale"))
        )
        hueSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(uniformColor.data[0])
            .map(h => h.toPrecision(3).toString())
            .to(Gear.text("hue"))
        )
        saturationSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(uniformColor.data[1])
            .map(s => s.toPrecision(3).toString())
            .to(Gear.text("saturation"))
        )
        intensitySpan = Gear.sinkFlow(flow => flow
            .defaultsTo(uniformIntensity.data[0])
            .map(i => i.toPrecision(3).toString())
            .to(Gear.text("intensity"))
        )
        paletteSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(uniformPalette.data[0])
            .map(s => s.toPrecision(3).toString())
            .to(Gear.text("palette"))
        )


        canvas = Gear.ElementEvents.create("canvas-gl")
        canvas.dragging.branch(
            flow => flow.filter(selected("move")).producer(d => move(d)),
            flow => flow.filter(selected("zoom")).producer(d => zoom(d)),
            flow => flow.filter(selected("color")).producer(d => colorize(d)),
            flow => flow.filter(selected("intensity")).producer(d => intensity(d)),
            flow => flow.filter(selected("palette")).producer(d => palette(d)),
        )

        Gear.Flow.from(canvas.clickPos, canvas.touchStartPos.map(ps => ps[0]))
            .filter(selected("music"))
            .map(pos => toComplexNumber(pos))
            .producer(c => play(c))

        draw()
    }

    function play(c: Space.Vector) {
        const channel1 = audioBuffer.getChannelData(0)
        const channel2 = audioBuffer.getChannelData(1)
        let sum1 = 0
        let sum2 = 0
        let z = Space.vec(0, 0)
        for (let i = 0; i < audioBuffer.length && z.length < 2.0; i++) {
            const [x, y] = z.coordinates
            z = Space.vec(x * x - y * y, 2 * x * y).plus(c)
            channel1[i] = z.coordinates[0] / 2
            channel2[i] = z.coordinates[1] / 2
            sum1 += channel1[i]
            sum2 += channel2[i]
        }
        if (z.length < 2.0) {
            const avg1 = sum1 / channel1.length
            const avg2 = sum2 / channel2.length
            for (let i = 0; i < audioBuffer.length; i++) {
                const attenuation = Math.pow(1 - i / audioBuffer.length, 2)
                channel1[i] = attenuation * (channel1[i] - avg1)
                channel2[i] = attenuation * (channel2[i] - avg2)
            }
            playBuffer()
        }
    }

    function playBuffer() {
        const source = audioContext.createBufferSource()
        source.channelCount = 2
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        source.start()
    }

    function toComplexNumber(pos: Gear.PointerPosition): Space.Vector {
        return Space.vec(...pos)
            .divide(Space.vec(canvas.element.clientWidth / 2, -canvas.element.clientHeight / 2))
            .plus(Space.vec(-1, 1))
            .scale(scale)
            .plus(center)
    }

    function action(key: string) {
        switch (key.toUpperCase()) {
            case "M": return "move"
            case "Z": return "zoom"
            case "C": return "color"
            case "I": return "intensity"
            case "P": return "palette"
            case "N": return "music"
            default: return null
        }
    }

    function selected<T>(value: string): Gear.Predicate<T> {
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
            scaleSpan.consumer(newScale)
            centerSpan.consumer(newCenter)
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
            centerSpan.consumer(newCenter)
            draw()
        }
    }

    function colorize(dragging: Gear.Dragging) {
        const hue = 2 * dragging.pos[0] / canvas.element.clientWidth
        const saturation = 1 - dragging.pos[1] / canvas.element.clientHeight
        uniformColor.data = [hue, saturation]
        hueSpan.consumer(hue)
        saturationSpan.consumer(saturation)
        draw()
    }
    
    function intensity(dragging: Gear.Dragging) {
        const intensity = 1 - dragging.pos[1] / canvas.element.clientWidth
        uniformIntensity.data = [intensity]
        intensitySpan.consumer(intensity)
        draw()
    }
    
    function palette(dragging: Gear.Dragging) {
        const palette = 1.5 - 2 * dragging.pos[1] / canvas.element.clientWidth
        uniformPalette.data = [palette > 1 ? 1 : palette < 0 ? 0 : palette]
        paletteSpan.consumer(palette)
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