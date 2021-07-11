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
import * as Space from "../space/all.js";
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
    window.onload = () => Gear.load("/shaders", () => Space.initWaModules(() => doInit()), ["uniformColors.vert", shader => vertexShaderCode = shader], ["uniformColors.frag", shader => fragmentShaderCode = shader]);
}
const viewMatrix = Space.Matrix.globalView(Space.vec(-2, 2, 10), Space.vec(0, 0, 0), Space.vec(0, 1, 0));
const projectionMatrix = Space.Matrix.project(4, 100, 1);
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
        modelIndex = (yield modelIndexResponse.json());
        const modelElement = document.getElementById("model");
        for (let entry of modelIndex) {
            modelElement.appendChild(new Option(entry.name, entry.name, entry.name == 'DamagedHelmet', entry.name == 'DamagedHelmet'));
        }
        modelElement.value = 'DamagedHelmet';
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
        matView.data = viewMatrix.asColumnMajorArray;
        matProjection.data = projectionMatrix.asColumnMajorArray;
        color.data = [0.5, 0, 0.5, 1];
        const gl = context.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearDepth(1);
        gl.clearColor(1, 1, 1, 1);
        Gear.readableValue("model").to(modelLoader());
        const canvas = Gear.elementEvents("canvas-gl");
        modelTransformer = new Gear.Transformer(canvas.element, projectionMatrix.by(viewMatrix));
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
            matView.data = matrix.by(viewMatrix).asColumnMajorArray;
            draw();
        }));
    });
}
function selected(value) {
    const mouseBinding = document.getElementById("mouse-binding");
    return () => mouseBinding.value == value;
}
function modelLoader() {
    return Gear.sinkFlow(flow => flow.defaultsTo('DamagedHelmet').producer((modelId) => __awaiter(this, void 0, void 0, function* () {
        const modelIndexEntry = modelIndex.find(entry => entry.name === modelId);
        const modelUri = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${modelId}/glTF/${modelIndexEntry === null || modelIndexEntry === void 0 ? void 0 : modelIndexEntry.variants.glTF}`;
        model = yield gltf.ActiveModel.create(modelUri, matModel, {
            "POSITION": position,
            "NORMAL": normal,
        }, context);
        modelTransformer.translationMatrix = Space.Matrix.identity();
        modelTransformer.rotationMatrix = Space.Matrix.identity();
        modelTransformer.scaleMatrix = Space.Matrix.identity();
        draw();
    })));
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
    const redVec = Space.vec(1, 0);
    const greenVec = Space.vec(Math.cos(third), Math.sin(third));
    const blueVec = Space.vec(Math.cos(2 * third), Math.sin(2 * third));
    return Gear.sinkFlow(flow => flow
        .defaultsTo([-0.4, -0.2])
        .map(([x, y]) => Space.vec(x, y))
        .producer(vec => {
        const red = Math.min(2, 1 + vec.dot(redVec)) / 2;
        const green = Math.min(2, 1 + vec.dot(greenVec)) / 2;
        const blue = Math.min(2, 1 + vec.dot(blueVec)) / 2;
        color.data = [red, green, blue, 1];
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
        model.defaultScene.render(gltf.Matrix.create(modelTransformer.matrix.asColumnMajorArray));
    }
    gl.flush();
}
//# sourceMappingURL=toy.js.map