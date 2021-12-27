import { aether, gear } from "/gen/libs.js";
import { wgl, gltf } from "../djee/index.js"
import * as dragging from "../utils/dragging.js";

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

let context: wgl.Context;

let position: wgl.Attribute;
let normal: wgl.Attribute;

let uPositionsMat: wgl.Uniform;
let uNormalsMat: wgl.Uniform;
let uProjectionMat: wgl.Uniform;
let uLightPosition: wgl.Uniform;
let uLightRadius: wgl.Uniform;
let uColor: wgl.Uniform;
let uShininess: wgl.Uniform;
let uFogginess: wgl.Uniform;

let modelIndex: ModelIndexEntry[]
let model: gltf.ActiveModel<wgl.IndicesBuffer, wgl.AttributesBuffer>

let lightPosition: aether.Vec<3> = [2, 2, 2]
let viewMatrix: aether.Mat<4> = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0])
let modelMatrix: aether.Mat<4> = aether.mat4.identity()

export function init() {
    window.onload = () => doInit();
}

const projectionMatrix = aether.mat4.projection(2);

async function doInit() {
    const shaders = await gear.fetchTextFiles({
        vertexShaderCode: "generic.vert",
        fragmentShaderCode: "generic.frag"
    }, "/shaders")

    const modelIndexResponse = await fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json")
    modelIndex = await modelIndexResponse.json() as ModelIndexEntry[]

    const modelElement = document.getElementById("model") as HTMLSelectElement
    for (let entry of modelIndex) {
        modelElement.appendChild(new Option(entry.name, entry.name))
    }

    context = wgl.Context.of("canvas-gl");

    const program = context.link(
        context.vertexShader(shaders.vertexShaderCode),
        context.fragmentShader(shaders.fragmentShaderCode)
    )
    program.use();

    position = program.attribute("position");
    normal = program.attribute("normal");

    normal.setTo(0, 0, 1)

    const canvas = gear.elementEvents("canvas-gl");
    const viewRotation = new dragging.RotationDragging(() => viewMatrix, () => projectionMatrix)
    const modelRotation = new dragging.RotationDragging(
        () => modelMatrix, 
        () => aether.mat4.mul(projectionMatrix, viewMatrix), 
        4
    )
    const modelTranslation = new dragging.TranslationDragging(
        () => modelMatrix, 
        () => aether.mat4.mul(projectionMatrix, viewMatrix), 
        4
    )
    const modelScale = new dragging.ScaleDragging(
        () => modelMatrix, 
        4
    )

    uPositionsMat = program.uniform("positionsMat");
    uNormalsMat = program.uniform("normalsMat");
    uProjectionMat = program.uniform("projectionMat");

    uLightPosition = program.uniform("lightPosition");
    uLightRadius = program.uniform("lightRadius");
    uColor = program.uniform("color");
    uShininess = program.uniform("shininess");
    uFogginess = program.uniform("fogginess");

    uProjectionMat.data = aether.mat4.columnMajorArray(projectionMatrix);
    uColor.data = [0.5, 0, 0.5, 1]
    uLightPosition.data = lightPosition
    uLightRadius.data = [0.1]

    const gl = context.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.clearDepth(1);
    gl.clearColor(1, 1, 1, 1);

    const mouseBinding = gear.readableValue("mouse-binding");
    gear.invokeLater(() => mouseBinding.flow("modelRotation"))

    const model = gear.readableValue("model");
    gear.invokeLater(() => model.flow("ScalarField"))

    modelLoaderTarget().value = model

    const cases = {
        lightPosition: new gear.Value<gear.Dragging>(),
        lightRadius: new gear.Value<gear.Dragging>(),
        color: new gear.Value<gear.Dragging>(),
        shininess: new gear.Value<gear.Dragging>(),
        fogginess: new gear.Value<gear.Dragging>(),
        modelRotation: new gear.Value<gear.Dragging>(),
        modelMove: new gear.Value<gear.Dragging>(),
        modelScale: new gear.Value<gear.Dragging>(),
        viewRotation: new gear.Value<gear.Dragging>(),
    }

    canvas.dragging.value.switch(mouseBinding, cases)

    lightPositionTarget().value = cases.lightPosition
        .then(gear.drag(dragging.positionDragging))
        .map(p => aether.vec2.length(p) > 1 ? aether.vec2.unit(p) : p)
        .map(([x, y]) => aether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
        .defaultsTo(aether.vec2.of(0, 0))

    lightRadiusTarget().value = cases.lightRadius
        .then(gear.drag(dragging.positionDragging))
        .map(([x, y]) => (y + 1) / 2)
        .defaultsTo(0.1)

    colorTarget().value = cases.color
        .then(gear.drag(dragging.positionDragging))
        .defaultsTo([-0.4, -0.2])

    shininessTarget().value = cases.shininess
        .then(gear.drag(dragging.positionDragging))
        .map(([x, y]) => (y + 1) / 2)
        .defaultsTo(0)

    fogginessTarget().value = cases.fogginess
        .then(gear.drag(dragging.positionDragging))
        .map(([x, y]) => (y + 1) / 2)
        .defaultsTo(0)

    modelMatrixTarget().value = gear.Value.from(
        cases.modelRotation.then(gear.drag(modelRotation)),
        cases.modelMove.then(gear.drag(modelTranslation)),
        cases.modelScale.then(gear.drag(modelScale)),
    )

    viewMatrixTarget().value = cases.viewRotation.then(gear.drag(viewRotation))

}

function modelMatrixTarget(): gear.Target<aether.Mat<4>> {
    return new gear.Target(matrix => {
        modelMatrix = matrix
        draw()
    })
}

function viewMatrixTarget(): gear.Target<aether.Mat<4>> {
    return new gear.Target(matrix => {
        viewMatrix = matrix
        draw()
    })
}

function modelLoaderTarget(): gear.Target<string> {
    return new gear.Target(async (modelId) => {
        const modelUri = getModelUri(modelId)
        const renderer = new wgl.GLRenderer(context, {
            "POSITION" : position,
            "NORMAL" : normal,
        }, uPositionsMat, uNormalsMat)
        model = await gltf.ActiveModel.create(modelUri, renderer)
        modelMatrix = aether.mat4.identity()
        draw()
    })
}

function getModelUri(modelId: string) {
    switch (modelId) {
        case "ScalarFieldIn": return new URL('/models/ScalarFieldIn.gltf', window.location.href).href;
        case "ScalarField": return new URL('/models/ScalarField.gltf', window.location.href).href;
        case "ScalarFieldOut": return new URL('/models/ScalarFieldOut.gltf', window.location.href).href;
        case "SculptTorso": return new URL('/models/SculptTorso.gltf', window.location.href).href;
        case "SculptHead": return new URL('/models/SculptHead.gltf', window.location.href).href;
        default:
            const modelIndexEntry = modelIndex.find(entry => entry.name === modelId);
            return `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${modelId}/glTF/${modelIndexEntry?.variants.glTF}`;
    }
}

function lightPositionTarget(): gear.Target<gear.PointerPosition> {
    return new gear.Target(([x, y]) => {
        const p: aether.Vec4 = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1]
        lightPosition = aether.vec3.from(aether.vec4.add(viewMatrix[3], p))
        uLightPosition.data = lightPosition
        draw();
    })
}

function lightRadiusTarget(): gear.Target<number> {
    return new gear.Target(value => {
        uLightRadius.data = [value];
        draw();
    })
}

function shininessTarget(): gear.Target<number> {
    return new gear.Target(value => {
        uShininess.data = [value];
        draw();
    })
}

function colorTarget(): gear.Target<gear.PointerPosition> {
    const third = 2 * Math.PI / 3
    const redVec: aether.Vec<2> = [1, 0];
    const greenVec: aether.Vec<2> = [Math.cos(third), Math.sin(third)];
    const blueVec: aether.Vec<2> = [Math.cos(2 * third), Math.sin(2 * third)];
    return new gear.Target(vec => {
        const red = Math.min(2, 1 + aether.vec2.dot(vec, redVec)) / 2;
        const green = Math.min(2, 1 + aether.vec2.dot(vec, greenVec)) / 2;
        const blue = Math.min(2, 1 + aether.vec2.dot(vec, blueVec)) / 2;
        uColor.data = [red, green, blue, 1];
        draw();
    });
}

function fogginessTarget(): gear.Target<number> {
    return new gear.Target(value => {
        uFogginess.data = [value];
        draw();
    })
}

function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (model) {
        model.render(aether.mat4.mul(viewMatrix, modelMatrix))
    }
    gl.flush();
}
