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
import { mat4, vec2 } from '../space/all.js';
import * as Gear from "../gear/all.js";
import * as gltf from "../djee/gltf.js";
let vertexShaderCode;
let fragmentShaderCode;
let context;
let position;
let normal;
let matModel;
let matView;
let matProjection;
let lightPosition;
let color;
let shininess;
let fogginess;
let modelIndex;
let model;
let modelTransformer;
let viewTransformer;
export function init() {
    window.onload = () => Gear.load("/shaders", () => doInit(), ["uniformColors.vert", shader => vertexShaderCode = shader], ["uniformColors.frag", shader => fragmentShaderCode = shader]);
}
const viewMatrix = mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
const projectionMatrix = mat4.projection(2);
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
        modelIndex = (yield modelIndexResponse.json());
        const modelElement = document.getElementById("model");
        for (let entry of modelIndex) {
            modelElement.appendChild(new Option(entry.name, entry.name));
        }
        context = Djee.Context.of("canvas-gl");
        const program = context.link(context.vertexShader(vertexShaderCode), context.fragmentShader(fragmentShaderCode));
        program.use();
        position = program.attribute("position");
        normal = program.attribute("normal");
        normal.setTo(0, 0, 1);
        matModel = program.uniform("matModel");
        matView = program.uniform("matView");
        matProjection = program.uniform("matProjection");
        lightPosition = program.uniform("lightPosition");
        color = program.uniform("color");
        shininess = program.uniform("shininess");
        fogginess = program.uniform("fogginess");
        matView.data = mat4.columnMajorArray(viewMatrix);
        matProjection.data = mat4.columnMajorArray(projectionMatrix);
        color.data = [0.5, 0, 0.5, -1];
        const gl = context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);
        Gear.readableValue("model").to(modelLoader());
        const canvas = Gear.elementEvents("canvas-gl");
        modelTransformer = new Gear.Transformer(canvas.element, mat4.mul(projectionMatrix, viewMatrix), 4);
        viewTransformer = new Gear.Transformer(canvas.element, projectionMatrix);
        canvas.dragging.branch(flow => flow.map(d => d.pos).map(([x, y]) => Gear.pos(2 * (x - canvas.element.clientWidth / 2) / canvas.element.clientWidth, 2 * (canvas.element.clientHeight / 2 - y) / canvas.element.clientHeight)).branch(flow => flow.filter(selected("lightPosition")).to(lightPositionSink()), flow => flow.filter(selected("color")).to(colorSink()), flow => flow.filter(selected("shininess")).map(([x, y]) => y).to(shininessSink()), flow => flow.filter(selected("fogginess")).map(([x, y]) => y).to(fogginessSink())), flow => flow
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
            .producer(matrix => {
            matView.data = mat4.columnMajorArray(mat4.mul(matrix, viewMatrix));
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
        model = yield gltf.ActiveModel.create(modelUri, matModel, {
            "POSITION": position,
            "NORMAL": normal,
        }, context);
        modelTransformer.translationMatrix = mat4.identity();
        // modelTransformer.rotationMatrix = Space.Matrix.identity()
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
        .defaultsTo([0.5, 0.5])
        .map(([x, y]) => [x * Math.PI / 2, y * Math.PI / 2])
        .producer(([x, y]) => {
        lightPosition.data = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
        draw();
    }));
}
function shininessSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
        shininess.data = [value];
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
        color.data = [red, green, blue, -1];
        draw();
    }));
}
function fogginessSink() {
    return Gear.sinkFlow(flow => flow
        .defaultsTo(-1)
        .map(value => (value + 1) / 2)
        .producer(value => {
        fogginess.data = [value];
        draw();
    }));
}
function draw() {
    const gl = context.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (model) {
        model.defaultScene.render(gltf.Matrix.create(mat4.columnMajorArray(modelTransformer.matrix)));
    }
    gl.flush();
}
//# sourceMappingURL=toy.js.map