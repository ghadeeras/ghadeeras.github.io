import * as Djee from "../djee/all.js"
import * as Space from "../space/all.js"
import * as Gear from "../gear/all.js"

type FieldSampler = (x: number, y: number, z: number) => Space.Vector;

let resolution = 64;
let fieldSampler: FieldSampler = envelopedCosine;

let vertexShaderCode: string;
let fragmentShaderCode: string;

let context: Djee.Context;

let position: Djee.Attribute;
let normal: Djee.Attribute;

let matModel: Djee.Uniform;
let matProjection: Djee.Uniform;
let lightPosition: Djee.Uniform;
let color: Djee.Uniform;
let shininess: Djee.Uniform;
let fogginess: Djee.Uniform;

let contourSurfaceBuffer: Djee.Buffer;

let contourValue: number = 0;
let fieldRef: number = 0;

export function init() {
    window.onload = () => Gear.load("/shaders", () => Space.initWaModules(() => doInit()),
        ["uniformColors.vert", shader => vertexShaderCode = shader],
        ["uniformColors.frag", shader => fragmentShaderCode = shader]
    );
}

function doInit() {
    fieldRef = sampleField();

    context = new Djee.Context("canvas-gl");

    const program = context.link([
        context.vertexShader(vertexShaderCode),
        context.fragmentShader(fragmentShaderCode)
    ])
    program.use();

    contourSurfaceBuffer = context.newBuffer();

    position = program.locateAttribute("position", 3);
    normal = program.locateAttribute("normal", 3);

    matModel = program.locateUniform("matModel", 4, true);
    const matView = program.locateUniform("matView", 4, true);
    matProjection = program.locateUniform("matProjection", 4, true);

    lightPosition = program.locateUniform("lightPosition", 3);
    color = program.locateUniform("color", 4);
    shininess = program.locateUniform("shininess", 1);
    fogginess = program.locateUniform("fogginess", 1);

    matModel.data = Space.Matrix.identity().asColumnMajorArray
    matView.data = Space.Matrix.globalView(Space.vec(-2, 2, 10), Space.vec(0, 0, 0), Space.vec(0, 1, 0)).asColumnMajorArray;
    matProjection.data = Space.Matrix.project(4, 100, 1).asColumnMajorArray;

    const gl = context.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.clearDepth(1);
    gl.clearColor(1, 1, 1, 1);

    const canvas = Gear.elementEvents("canvas-gl");
    const mouseButtonPressed = canvas.mouseButons.map(([l, m, r]) => l);
    Gear.Flow.from(
        canvas.mousePos.then(Gear.flowSwitch(mouseButtonPressed)),
        canvas.touchPos.map(positions => positions[0])
    ).map(([x, y]) => Gear.pos(
        2 * (x - canvas.element.clientWidth / 2 ) / canvas.element.clientWidth, 
        2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight
    )).branch(
        flow => flow.filter(selected("rotation")).to(rotationSink()),
        flow => flow.filter(selected("focalRatio")).map(([x, y]) => y).to(focalRatioSink()),
        flow => flow.filter(selected("lightPosition")).to(lightPositionSink()),
        flow => flow.filter(selected("contourValue")).map(([x, y]) => y).to(contourValueSink()),
        flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(shininessSink()),
        flow => flow.filter(selected("fogginess")).map(([x, y]) => y).to(fogginessSink()),
    );
    levelOfDetailsFlow().to(levelOfDetailsSink());
    Gear.readableValue("function").to(functionSink());
}

function selected(value: string): Gear.Predicate<Gear.PointerPosition> {
    const mouseBinding = document.getElementById("mouse-binding") as HTMLInputElement;
    return () => mouseBinding.value == value;
}

function levelOfDetailsFlow() {
    const inc = Gear.elementEvents("lod-inc").mouseButons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? +8 : 0);
    const dec = Gear.elementEvents("lod-dec").mouseButons
        .map(([l, m, r]) => l)
        .map((pressed) => pressed ? -8 : 0);
    const flow = Gear.Flow.from(inc, dec)
        .defaultsTo(0)
        .then(Gear.repeater(128, 0))
        .reduce((i, lod) => clamp(lod + i, 32, 96), 64);
    flow.map(lod => lod.toString()).to(Gear.text("lod"))
    return flow;
}

function clamp(n: number, min: number, max: number) {
    return n < min ? min : (n > max ? max : n);
}

function levelOfDetailsSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(64)
        .producer(lod => {
            resolution = lod;
            fieldRef = sampleField();
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
            draw();
        })
    )
}

function contourValueSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(0)
        .producer(newContourValue => {
            contourValue = newContourValue;
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
            color.data = fieldColor(contourValue, 1).coordinates;
            draw();
        })
    )
}

function fieldColor(fieldValue: number, alpha: number = 0.4): Space.Vector {
    return Space.vec((1 + fieldValue) / 2, 0, (1 - fieldValue) / 2, alpha);
}

function rotationSink(): Gear.Sink<Gear.PointerPosition> {
    const axisX = Space.vec(1, 0, 0);
    const axisY = Space.vec(0, 1, 0);
    return Gear.sinkFlow(flow => flow.defaultsTo([0, 0]).producer(([x, y]) => {
        matModel.data = 
            Space.Matrix.rotation(y * Math.PI, axisX)
            .by(Space.Matrix.rotation(x * Math.PI, axisY))
            .asColumnMajorArray;
        draw();
    }));
}

function focalRatioSink(): Gear.Sink<number> {
    const axisX = Space.vec(1, 0, 0);
    const axisY = Space.vec(0, 1, 0);
    return Gear.sinkFlow(flow => flow.defaultsTo(0).map(ratio => (ratio + 1.4) * 3).producer(ratio => {
        matProjection.data = Space.Matrix.project(ratio, 100, 1).asColumnMajorArray;
        draw();
    }));
}

function lightPositionSink(): Gear.Sink<Gear.PointerPosition> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo([0.5, 0.5])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
            lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
            draw();
        })
    );
}

function shininessSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            shininess.data = [value];
            draw();
        })
    );
}

function fogginessSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            fogginess.data = [value];
            draw();
        })
    );
}

function functionSink(): Gear.Sink<string> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo("xyz")
        .producer(functionName => {
            fieldSampler = getFieldFunction(functionName);
            fieldRef = sampleField();
            contourSurfaceBuffer.data = contourSurfaceData(fieldRef, contourValue);
            draw();
        })
    )
}

function getFieldFunction(functionName: string) {
    switch (functionName) {
        case "xyz": return xyz;
        case "envelopedCosine": return envelopedCosine;
        default: return xyz;
    }
}

function sampleField(): number {
    const stack = Space.modules.stack.exports;
    const space = Space.modules.space.exports;
    stack.leave();

    stack.leave();
    stack.enter();
    const ref = stack.allocate8(0);
    for (let z = 0; z <= resolution; z++) {
        for (let y = 0; y <= resolution; y++) {
            for (let x = 0; x <= resolution; x++) {
                const px = 2 * x / resolution - 1;
                const py = 2 * y / resolution - 1;
                const pz = 2 * z / resolution - 1;
                const v = fieldSampler(px, py, pz).coordinates;
                space.vec4(px, py, pz, 1);
                space.vec4(v[0], v[1], v[2], v[3]);
            }
        }
    }
    stack.enter();
    return ref;
}

function contourSurfaceData(fieldRef: number, contourValue: number): Float32Array {
    const stack = Space.modules.stack.exports;
    const scalarField = Space.modules.scalarField.exports;
    stack.leave();
    stack.enter();
    const begin = scalarField.tesselateScalarField(fieldRef, resolution, contourValue);
    const end = stack.allocate8(0);
    const result = new Float32Array(new Float64Array(stack.stack.buffer, begin, (end - begin) / 8));
    return result;
}

const twoPi = 2 * Math.PI;

function xyz(x: number, y: number, z: number): Space.Vector {
    return Space.vec(
        y * z,
        z * x,
        x * y,
        x * y * z
    )
}

function envelopedCosine(x: number, y: number, z: number): Space.Vector {
    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
        const piX2 = Math.PI * x2;
        const piY2 = Math.PI * y2;
        const piZ2 = Math.PI * z2;
        const envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8;

        const piX = Math.PI * x;
        const piY = Math.PI * y;
        const piZ = Math.PI * z;
        const value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ);

        const dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4; 
        const dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4; 
        const dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4; 

        const dValueDX = -twoPi * Math.sin(2 * piX);
        const dValueDY = -twoPi * Math.sin(2 * piY);
        const dValueDZ = -twoPi * Math.sin(2 * piZ);

        return Space.vec(
            dEnvelopeDX * value + envelope * dValueDX,
            dEnvelopeDY * value + envelope * dValueDY,
            dEnvelopeDZ * value + envelope * dValueDZ,
            envelope * value / 3
        )
    } else {
        return Space.vec(0, 0, 0, 0);
    }
}

function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    position.pointTo(contourSurfaceBuffer, 6, 0);
    normal.pointTo(contourSurfaceBuffer, 6, 3);
    gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, contourSurfaceBuffer.data.length / 6);

    gl.finish();
    gl.flush();
}
