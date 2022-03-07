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
import * as dragging from "../utils/dragging.js";
import { newViewFactory } from "./view.js";
let modelIndex;
let viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
let modelMatrix = aether.mat4.identity();
const projectionMatrix = aether.mat4.projection(2);
export function init() {
    window.onload = () => doInit();
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
        modelIndex = (yield modelIndexResponse.json());
        const viewFactory = yield newViewFactory("canvas-gl");
        const modelElement = document.getElementById("model");
        for (let entry of modelIndex) {
            modelElement.appendChild(new Option(entry.name, entry.name));
        }
        const canvas = gear.elementEvents("canvas-gl");
        const viewRotation = new dragging.RotationDragging(() => viewMatrix, () => projectionMatrix);
        const modelRotation = new dragging.RotationDragging(() => modelMatrix, () => aether.mat4.mul(projectionMatrix, viewMatrix), 4);
        const modelTranslation = new dragging.TranslationDragging(() => modelMatrix, () => aether.mat4.mul(projectionMatrix, viewMatrix), 4);
        const modelScale = new dragging.ScaleDragging(() => modelMatrix, 4);
        const mouseBinding = gear.readableValue("mouse-binding");
        const model = gear.readableValue("model");
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
        const view = yield viewFactory({
            matModel: gear.Value.from(cases.modelRotation.then(gear.drag(modelRotation)), cases.modelMove.then(gear.drag(modelTranslation)), cases.modelScale.then(gear.drag(modelScale)), model.map(() => aether.mat4.identity())).defaultsTo(modelMatrix).attach(mat => modelMatrix = mat),
            matView: gear.Value.from(cases.viewRotation.then(gear.drag(viewRotation)), model.map(() => aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]))).defaultsTo(viewMatrix).attach(mat => viewMatrix = mat),
            color: cases.color
                .then(gear.drag(dragging.positionDragging))
                .map(positionToColor())
                .defaultsTo([0.8, 0.8, 0.8, 1.0]),
            lightPosition: cases.lightPosition
                .then(gear.drag(dragging.positionDragging))
                .map(p => aether.vec2.length(p) > 1 ? aether.vec2.unit(p) : p)
                .map(([x, y]) => aether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
                .map(positionToLightPosition())
                .defaultsTo(aether.vec3.of(2, 2, 2)),
            lightRadius: cases.lightRadius
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(0.1),
            shininess: cases.shininess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(0),
            fogginess: cases.fogginess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(0),
            modelUri: model.map(getModelUri),
        });
        gear.text("status").value = view.status;
        mouseBinding.flow("modelRotation");
        model.flow("ScalarField");
        const frame = () => {
            view.draw();
            requestAnimationFrame(frame);
        };
        frame();
    });
}
function positionToLightPosition() {
    return ([x, y]) => {
        const p = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1];
        return aether.vec3.from(aether.vec4.add(viewMatrix[3], p));
    };
}
function positionToColor() {
    const third = 2 * Math.PI / 3;
    const redVec = [1, 0];
    const greenVec = [Math.cos(third), Math.sin(third)];
    const blueVec = [Math.cos(2 * third), Math.sin(2 * third)];
    return vec => {
        const red = Math.min(2, 1 + aether.vec2.dot(vec, redVec)) / 2;
        const green = Math.min(2, 1 + aether.vec2.dot(vec, greenVec)) / 2;
        const blue = Math.min(2, 1 + aether.vec2.dot(vec, blueVec)) / 2;
        return [red, green, blue, 1.0];
    };
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
//# sourceMappingURL=toy.js.map