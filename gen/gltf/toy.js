var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether, gear } from "/gen/libs.js";
import * as djee from "../djee/all.js";
import * as gltf from "../djee/gltf.js";
import * as dragging from "../utils/dragging.js";
let context;
let position;
let normal;
let uPositionsMat;
let uNormalsMat;
let uProjectionMat;
let uLightPosition;
let uLightRadius;
let uColor;
let uShininess;
let uFogginess;
let modelIndex;
let model;
let lightPosition = [2, 2, 2];
let viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
let modelMatrix = aether.mat4.identity();
export function init() {
    window.onload = () => doInit();
}
const projectionMatrix = aether.mat4.projection(2);
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield gear.fetchTextFiles({
            vertexShaderCode: "generic.vert",
            fragmentShaderCode: "generic.frag"
        }, "/shaders");
        const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
        modelIndex = (yield modelIndexResponse.json());
        const modelElement = document.getElementById("model");
        for (let entry of modelIndex) {
            modelElement.appendChild(new Option(entry.name, entry.name));
        }
        context = djee.Context.of("canvas-gl");
        const program = context.link(context.vertexShader(shaders.vertexShaderCode), context.fragmentShader(shaders.fragmentShaderCode));
        program.use();
        position = program.attribute("position");
        normal = program.attribute("normal");
        normal.setTo(0, 0, 1);
        const canvas = gear.elementEvents("canvas-gl");
        const viewRotation = new dragging.RotationDragging(() => viewMatrix, () => projectionMatrix);
        const modelRotation = new dragging.RotationDragging(() => modelMatrix, () => aether.mat4.mul(projectionMatrix, viewMatrix), 4);
        const modelTranslation = new dragging.TranslationDragging(() => modelMatrix, () => aether.mat4.mul(projectionMatrix, viewMatrix), 4);
        const modelScale = new dragging.ScaleDragging(() => modelMatrix, 4);
        uPositionsMat = program.uniform("positionsMat");
        uNormalsMat = program.uniform("normalsMat");
        uProjectionMat = program.uniform("projectionMat");
        uLightPosition = program.uniform("lightPosition");
        uLightRadius = program.uniform("lightRadius");
        uColor = program.uniform("color");
        uShininess = program.uniform("shininess");
        uFogginess = program.uniform("fogginess");
        uProjectionMat.data = aether.mat4.columnMajorArray(projectionMatrix);
        uColor.data = [0.5, 0, 0.5, 1];
        uLightPosition.data = lightPosition;
        uLightRadius.data = [0.1];
        const gl = context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);
        const mouseBinding = gear.readableValue("mouse-binding");
        gear.invokeLater(() => mouseBinding.flow("modelRotation"));
        const model = gear.readableValue("model");
        gear.invokeLater(() => model.flow("ScalarField"));
        modelLoaderTarget().value = model;
        const cases = {
            lightPosition: new gear.Value(),
            lightRadius: new gear.Value(),
            color: new gear.Value(),
            shininess: new gear.Value(),
            fogginess: new gear.Value(),
            modelRotation: new gear.Value(),
            modelMove: new gear.Value(),
            modelScale: new gear.Value(),
            viewRotation: new gear.Value(),
        };
        canvas.dragging.value.switch(mouseBinding, cases);
        lightPositionTarget().value = cases.lightPosition
            .then(gear.drag(dragging.positionDragging))
            .map(p => aether.vec2.length(p) > 1 ? aether.vec2.unit(p) : p)
            .map(([x, y]) => aether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
            .defaultsTo(aether.vec2.of(0, 0));
        lightRadiusTarget().value = cases.lightRadius
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => (y + 1) / 2)
            .defaultsTo(0.1);
        colorTarget().value = cases.color
            .then(gear.drag(dragging.positionDragging))
            .defaultsTo([-0.4, -0.2]);
        shininessTarget().value = cases.shininess
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => (y + 1) / 2)
            .defaultsTo(0);
        fogginessTarget().value = cases.fogginess
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => (y + 1) / 2)
            .defaultsTo(0);
        modelMatrixTarget().value = gear.Value.from(cases.modelRotation.then(gear.drag(modelRotation)), cases.modelMove.then(gear.drag(modelTranslation)), cases.modelScale.then(gear.drag(modelScale)));
        viewMatrixTarget().value = cases.viewRotation.then(gear.drag(viewRotation));
    });
}
function modelMatrixTarget() {
    return new gear.Target(matrix => {
        modelMatrix = matrix;
        draw();
    });
}
function viewMatrixTarget() {
    return new gear.Target(matrix => {
        viewMatrix = matrix;
        draw();
    });
}
function modelLoaderTarget() {
    return new gear.Target((modelId) => __awaiter(this, void 0, void 0, function* () {
        const modelUri = getModelUri(modelId);
        const renderer = new gltf.GLRenderer(context, {
            "POSITION": position,
            "NORMAL": normal,
        }, uPositionsMat, uNormalsMat);
        model = yield gltf.ActiveModel.create(modelUri, renderer);
        modelMatrix = aether.mat4.identity();
        draw();
    }));
}
function getModelUri(modelId) {
    switch (modelId) {
        case "ScalarFieldIn": return new URL('/models/ScalarFieldIn.gltf', window.location.href).href;
        case "ScalarField": return new URL('/models/ScalarField.gltf', window.location.href).href;
        case "ScalarFieldOut": return new URL('/models/ScalarFieldOut.gltf', window.location.href).href;
        case "SculptTorso": return new URL('/models/SculptTorso.gltf', window.location.href).href;
        case "SculptHead": return new URL('/models/SculptHead.gltf', window.location.href).href;
        default:
            const modelIndexEntry = modelIndex.find(entry => entry.name === modelId);
            return `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${modelId}/glTF/${modelIndexEntry === null || modelIndexEntry === void 0 ? void 0 : modelIndexEntry.variants.glTF}`;
    }
}
function lightPositionTarget() {
    return new gear.Target(([x, y]) => {
        const p = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1];
        lightPosition = aether.vec3.from(aether.vec4.add(viewMatrix[3], p));
        uLightPosition.data = lightPosition;
        draw();
    });
}
function lightRadiusTarget() {
    return new gear.Target(value => {
        uLightRadius.data = [value];
        draw();
    });
}
function shininessTarget() {
    return new gear.Target(value => {
        uShininess.data = [value];
        draw();
    });
}
function colorTarget() {
    const third = 2 * Math.PI / 3;
    const redVec = [1, 0];
    const greenVec = [Math.cos(third), Math.sin(third)];
    const blueVec = [Math.cos(2 * third), Math.sin(2 * third)];
    return new gear.Target(vec => {
        const red = Math.min(2, 1 + aether.vec2.dot(vec, redVec)) / 2;
        const green = Math.min(2, 1 + aether.vec2.dot(vec, greenVec)) / 2;
        const blue = Math.min(2, 1 + aether.vec2.dot(vec, blueVec)) / 2;
        uColor.data = [red, green, blue, 1];
        draw();
    });
}
function fogginessTarget() {
    return new gear.Target(value => {
        uFogginess.data = [value];
        draw();
    });
}
function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (model) {
        model.render(aether.mat4.mul(viewMatrix, modelMatrix));
    }
    gl.flush();
}
//# sourceMappingURL=toy.js.map