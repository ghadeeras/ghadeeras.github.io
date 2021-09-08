import * as Djee from "../djee/all.js"
import { mat4, vec2, Vec, Mat } from "../../ether/latest/index.js";
import * as Gear from "../gear/all.js"
import * as gltf from "../djee/gltf.js";

type ModelIndexEntry = {
    name: string,
    screenshot: string,
    variants: {
      glTF: string,
      "glTF-Binary": string,
      "glTF-Draco": string,
      "glTF-Embedded": string
    }
}

let context: Djee.Context;

let position: Djee.Attribute;
let normal: Djee.Attribute;

let uPositionsMat: Djee.Uniform;
let uNormalsMat: Djee.Uniform;
let uProjectionMat: Djee.Uniform;
let uLightPosition: Djee.Uniform;
let uLightRadius: Djee.Uniform;
let uColor: Djee.Uniform;
let uShininess: Djee.Uniform;
let uFogginess: Djee.Uniform;

let modelIndex: ModelIndexEntry[]
let model: gltf.ActiveModel

let modelTransformer: Gear.Transformer
let viewTransformer: Gear.Transformer
let lightPosition: Vec<3> = [2, 2, 2]
let viewMatrix: Mat<4> = mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])

export function init() {
    window.onload = () => doInit();
}

const projectionMatrix = mat4.projection(2);

async function doInit() {
    const shaders = await Gear.fetchFiles({
        vertexShaderCode: "generic.vert",
        fragmentShaderCode: "generic.frag"
    }, "/shaders")

    const modelIndexResponse = await fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json")
    modelIndex = await modelIndexResponse.json() as ModelIndexEntry[]

    const modelElement = document.getElementById("model") as HTMLSelectElement
    for (let entry of modelIndex) {
        modelElement.appendChild(new Option(entry.name, entry.name))
    }

    context = Djee.Context.of("canvas-gl");

    const program = context.link(
        context.vertexShader(shaders.vertexShaderCode),
        context.fragmentShader(shaders.fragmentShaderCode)
    )
    program.use();

    position = program.attribute("position");
    normal = program.attribute("normal");

    normal.setTo(0, 0, 1)

    const canvas = Gear.elementEvents("canvas-gl");
    viewTransformer = new Gear.Transformer(canvas.element, projectionMatrix)
    modelTransformer = new Gear.Transformer(canvas.element, mat4.mul(projectionMatrix, viewMatrix), 4)

    uPositionsMat = program.uniform("positionsMat");
    uNormalsMat = program.uniform("normalsMat");
    uProjectionMat = program.uniform("projectionMat");

    uLightPosition = program.uniform("lightPosition");
    uLightRadius = program.uniform("lightRadius");
    uColor = program.uniform("color");
    uShininess = program.uniform("shininess");
    uFogginess = program.uniform("fogginess");

    uProjectionMat.data = mat4.columnMajorArray(projectionMatrix);
    uColor.data = [0.5, 0, 0.5, 1]
    uLightPosition.data = lightPosition
    uLightRadius.data = [0.1]

    const gl = context.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.clearDepth(1);
    gl.clearColor(1, 1, 1, 1);

    Gear.readableValue("model").to(modelLoader())

    canvas.dragging.branch(
        flow => flow.map(d => d.pos).map(([x, y]) => Gear.pos(
            2 * x / canvas.element.clientWidth - 1, 
            1 - 2 * y / canvas.element.clientHeight
        )).branch(
            flow => flow.filter(selected("lightPosition")).to(lightPositionSink()),
            flow => flow.filter(selected("lightRadius")).map(([x, y]) => y).to(lightRadiusSink()),
            flow => flow.filter(selected("color")).to(colorSink()),
            flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(shininessSink()),
            flow => flow.filter(selected("fogginess")).map(([x, y]) => y).to(fogginessSink()),
        ),
        flow => flow
            .filter(selected("modelRotation"))
            .map(modelTransformer.rotation)
            .producer(draw),
        flow => flow
            .filter(selected("modelMove"))
            .map(modelTransformer.translation)
            .producer(draw),
        flow => flow
            .filter(selected("modelScale"))
            .map(modelTransformer.scale)
            .producer(draw),
        flow => flow
            .filter(selected("viewRotation"))
            .map(viewTransformer.rotation)
            .producer(m => {
                viewMatrix = mat4.mul(m, mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]))
                modelTransformer.viewMatrix = viewMatrix
                draw()
            })
    );

}

function selected<T>(value: string): Gear.Predicate<T> {
    const mouseBinding = document.getElementById("mouse-binding") as HTMLInputElement;
    return () => mouseBinding.value == value;
}

function modelLoader(): Gear.Sink<string> {
    return Gear.sinkFlow(flow => flow.defaultsTo('ScalarField').producer(async (modelId) => {
        const modelUri = getModelUri(modelId)
        model = await gltf.ActiveModel.create(modelUri, uPositionsMat, uNormalsMat, {
            "POSITION" : position,
            "NORMAL" : normal,
        }, context)
        modelTransformer.translationMatrix = mat4.identity()
        // modelTransformer.rotationMatrix = Ether.Matrix.identity()
        modelTransformer.scaleMatrix = mat4.identity()
        draw()
    }))
}

function getModelUri(modelId: string) {
    switch (modelId) {
        case "ScalarFieldIn": return new URL('/models/ScalarFieldIn.gltf', window.location.href).href;
        case "ScalarField": return new URL('/models/ScalarField.gltf', window.location.href).href;
        case "ScalarFieldOut": return new URL('/models/ScalarFieldOut.gltf', window.location.href).href;
        default:
            const modelIndexEntry = modelIndex.find(entry => entry.name === modelId);
            return `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${modelId}/glTF/${modelIndexEntry?.variants.glTF}`;
    }
}

function lightPositionSink(): Gear.Sink<Gear.PointerPosition> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo([0, 0])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
            lightPosition = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y) - 2]
            uLightPosition.data = lightPosition
            draw();
        })
    );
}

function lightRadiusSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-0.8)
        .map(value => (value + 1) / 2)
        .producer(value => {
            uLightRadius.data = [value];
            draw();
        })
    );
}

function shininessSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            uShininess.data = [value];
            draw();
        })
    );
}

function colorSink(): Gear.Sink<Gear.PointerPosition> {
    const third = 2 * Math.PI / 3
    const redVec: Vec<2> = [1, 0];
    const greenVec: Vec<2> = [Math.cos(third), Math.sin(third)];
    const blueVec: Vec<2> = [Math.cos(2 * third), Math.sin(2 * third)];
    return Gear.sinkFlow(flow => flow
        .defaultsTo([-0.4, -0.2])
        .producer(vec => {
        const red = Math.min(2, 1 + vec2.dot(vec, redVec)) / 2;
        const green = Math.min(2, 1 + vec2.dot(vec, greenVec)) / 2;
        const blue = Math.min(2, 1 + vec2.dot(vec, blueVec)) / 2;
        uColor.data = [red, green, blue, 1];
        draw();
    }));
}

function fogginessSink(): Gear.Sink<number> {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
            uFogginess.data = [value];
            draw();
        })
    );
}

function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (model) {
        model.defaultScene.render(mat4.mul(viewMatrix, modelTransformer.matrix))
    }
    gl.flush();
}

