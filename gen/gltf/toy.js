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
import * as misc from "../utils/misc.js";
import * as dragging from "../utils/dragging.js";
import { newViewFactory } from "./view.js";
let models;
let viewMatrix = aether.mat4.lookAt([-2, 2, 2], [0, 0, 0], [0, 1, 0]);
let modelMatrix = aether.mat4.identity();
let modelIndex = 1;
const projectionMatrix = aether.mat4.projection(2, undefined, undefined, 2);
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gltf";
export const huds = {
    "monitor": "monitor-button"
};
export function wires() {
    return {
        gitHubRepo,
        huds,
        video: null,
        init: controller => init(controller, true)
    };
}
export function init(toyController, wires = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const modelIndexResponse = yield fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json");
        models = (yield modelIndexResponse.json())
            .map(entry => [entry.name, `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${entry.name}/glTF/${entry.variants.glTF}`]);
        models.unshift(["ScalarFieldIn", new URL("/models/ScalarFieldIn.gltf", window.location.href).href], ["ScalarField", new URL("/models/ScalarField.gltf", window.location.href).href], ["ScalarFieldOut", new URL("/models/ScalarFieldOut.gltf", window.location.href).href], ["SculptTorso", new URL("/models/SculptTorso.gltf", window.location.href).href]);
        const canvas = gear.elementEvents("canvas");
        const viewRotation = new dragging.RotationDragging(() => viewMatrix, () => projectionMatrix);
        const modelRotation = new dragging.RotationDragging(() => modelMatrix, () => aether.mat4.mul(projectionMatrix, viewMatrix), 4);
        const modelTranslation = new dragging.TranslationDragging(() => modelMatrix, () => aether.mat4.mul(projectionMatrix, viewMatrix), 4);
        const modelScale = new dragging.ScaleDragging(() => modelMatrix, 4);
        const pressedKey = new gear.Value((c) => toyController.handler = e => {
            c(e);
            return false;
        }).filter(e => e.down).map(e => e.key);
        const model = pressedKey
            .map(k => ['[', ']'].indexOf(k))
            .filter(i => i >= 0)
            .map(i => i * 2 - 1)
            .map(i => modelIndex = (modelIndex + i + models.length) % models.length)
            .defaultsTo(1);
        const cases = {
            lightPosition: new gear.Value(),
            lightRadius: new gear.Value(),
            color: new gear.Value(),
            shininess: new gear.Value(),
            fogginess: new gear.Value(),
            modelRotation: new gear.Value(),
            modelMove: new gear.Value(),
            modelScale: new gear.Value(),
        };
        const keyMappings = {
            "m": cases.modelMove,
            "r": cases.modelRotation,
            "s": cases.modelScale,
            "c": cases.color,
            "h": cases.shininess,
            "d": cases.lightPosition,
            "l": cases.lightRadius,
            "f": cases.fogginess,
        };
        const mouseBinding = pressedKey
            .filter(k => k in keyMappings)
            .defaultsTo("r")
            .reduce((previous, current) => {
            control(previous).removeAttribute("style");
            control(current).setAttribute("style", "font-weight: bold");
            return current;
        }, "r");
        canvas.dragging.value.switch(mouseBinding, keyMappings);
        const viewFactory = yield newViewFactory(canvas.element.id, wires);
        const view = viewFactory({
            matModel: gear.Value.from(cases.modelRotation.then(gear.drag(modelRotation)), cases.modelMove.then(gear.drag(modelTranslation)), cases.modelScale.then(gear.drag(modelScale)), model.map(() => aether.mat4.identity())).defaultsTo(modelMatrix).attach(mat => modelMatrix = mat),
            matView: new gear.Value().defaultsTo(viewMatrix).attach(mat => viewMatrix = mat),
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
                .map(([_, y]) => (y + 1) / 2)
                .defaultsTo(0.1),
            shininess: cases.shininess
                .then(gear.drag(dragging.positionDragging))
                .map(([_, y]) => (y + 1) / 2)
                .defaultsTo(0),
            fogginess: cases.fogginess
                .then(gear.drag(dragging.positionDragging))
                .map(([_, y]) => (y + 1) / 2)
                .defaultsTo(0),
            modelUri: model.map(i => models[i][1]),
        });
        gear.text("model-name").value = model.map(i => models[i][0]);
        gear.text("status").value = view.status;
        model.flow(modelIndex);
        const frame = () => {
            view.draw();
            requestAnimationFrame(frame);
        };
        frame();
    });
}
function control(previous) {
    return misc.required(document.getElementById(`control-${previous}`));
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
//# sourceMappingURL=toy.js.map