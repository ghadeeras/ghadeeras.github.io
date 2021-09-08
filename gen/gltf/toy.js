var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as Djee from "../djee/all.js";
import { mat4, vec2 } from "../../ether/latest/index.js";
import * as Gear from "../gear/all.js";
import * as gltf from "../djee/gltf.js";
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
let modelTransformer;
let viewTransformer;
let lightPosition = [2, 2, 2];
let viewMatrix = mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
export function init() {
    window.onload = () => doInit();
}
const projectionMatrix = mat4.projection(2);
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const shaders = yield Gear.fetchFiles({
            vertexShaderCode: "generic.vert",
            fragmentShaderCode: "generic.frag"
        }, "/shaders");
        const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
        modelIndex = (yield modelIndexResponse.json());
        const modelElement = document.getElementById("model");
        for (let entry of modelIndex) {
            modelElement.appendChild(new Option(entry.name, entry.name));
        }
        context = Djee.Context.of("canvas-gl");
        const program = context.link(context.vertexShader(shaders.vertexShaderCode), context.fragmentShader(shaders.fragmentShaderCode));
        program.use();
        position = program.attribute("position");
        normal = program.attribute("normal");
        normal.setTo(0, 0, 1);
        const canvas = Gear.elementEvents("canvas-gl");
        viewTransformer = new Gear.Transformer(canvas.element, projectionMatrix);
        modelTransformer = new Gear.Transformer(canvas.element, mat4.mul(projectionMatrix, viewMatrix), 4);
        uPositionsMat = program.uniform("positionsMat");
        uNormalsMat = program.uniform("normalsMat");
        uProjectionMat = program.uniform("projectionMat");
        uLightPosition = program.uniform("lightPosition");
        uLightRadius = program.uniform("lightRadius");
        uColor = program.uniform("color");
        uShininess = program.uniform("shininess");
        uFogginess = program.uniform("fogginess");
        uProjectionMat.data = mat4.columnMajorArray(projectionMatrix);
        uColor.data = [0.5, 0, 0.5, 1];
        uLightPosition.data = lightPosition;
        uLightRadius.data = [0.1];
        const gl = context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);
        Gear.readableValue("model").to(modelLoader());
        canvas.dragging.branch(flow => flow.map(d => d.pos).map(([x, y]) => Gear.pos(2 * x / canvas.element.clientWidth - 1, 1 - 2 * y / canvas.element.clientHeight)).branch(flow => flow.filter(selected("lightPosition")).to(lightPositionSink()), flow => flow.filter(selected("lightRadius")).map(([x, y]) => y).to(lightRadiusSink()), flow => flow.filter(selected("color")).to(colorSink()), flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(shininessSink()), flow => flow.filter(selected("fogginess")).map(([x, y]) => y).to(fogginessSink())), flow => flow
            .filter(selected("modelRotation"))
            .map(modelTransformer.rotation)
            .producer(draw), flow => flow
            .filter(selected("modelMove"))
            .map(modelTransformer.translation)
            .producer(draw), flow => flow
            .filter(selected("modelScale"))
            .map(modelTransformer.scale)
            .producer(draw), flow => flow
            .filter(selected("viewRotation"))
            .map(viewTransformer.rotation)
            .producer(m => {
            viewMatrix = mat4.mul(m, mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]));
            modelTransformer.viewMatrix = viewMatrix;
            draw();
        }));
    });
}
function selected(value) {
    const mouseBinding = document.getElementById("mouse-binding");
    return () => mouseBinding.value == value;
}
function modelLoader() {
    return Gear.sinkFlow(flow => flow.defaultsTo('ScalarField').producer((modelId) => __awaiter(this, void 0, void 0, function* () {
        const modelUri = getModelUri(modelId);
        model = yield gltf.ActiveModel.create(modelUri, uPositionsMat, uNormalsMat, {
            "POSITION": position,
            "NORMAL": normal,
        }, context);
        modelTransformer.translationMatrix = mat4.identity();
        // modelTransformer.rotationMatrix = Ether.Matrix.identity()
        modelTransformer.scaleMatrix = mat4.identity();
        draw();
    })));
}
function getModelUri(modelId) {
    switch (modelId) {
        case "ScalarFieldIn": return new URL('/models/ScalarFieldIn.gltf', window.location.href).href;
        case "ScalarField": return new URL('/models/ScalarField.gltf', window.location.href).href;
        case "ScalarFieldOut": return new URL('/models/ScalarFieldOut.gltf', window.location.href).href;
        default:
            const modelIndexEntry = modelIndex.find(entry => entry.name === modelId);
            return `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${modelId}/glTF/${modelIndexEntry === null || modelIndexEntry === void 0 ? void 0 : modelIndexEntry.variants.glTF}`;
    }
}
function lightPositionSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo([0, 0])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
        lightPosition = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y) - 2];
        uLightPosition.data = lightPosition;
        draw();
    }));
}
function lightRadiusSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-0.8)
        .map(value => (value + 1) / 2)
        .producer(value => {
        uLightRadius.data = [value];
        draw();
    }));
}
function shininessSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
        uShininess.data = [value];
        draw();
    }));
}
function colorSink() {
    const third = 2 * Math.PI / 3;
    const redVec = [1, 0];
    const greenVec = [Math.cos(third), Math.sin(third)];
    const blueVec = [Math.cos(2 * third), Math.sin(2 * third)];
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
function fogginessSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
        uFogginess.data = [value];
        draw();
    }));
}
function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (model) {
        model.defaultScene.render(mat4.mul(viewMatrix, modelTransformer.matrix));
    }
    gl.flush();
}
//# sourceMappingURL=toy.js.map