import { aether, gear } from "/gen/libs.js";
import * as gearx from "../utils/gear.js"
import * as dragging from "../utils/dragging.js";
import { newViewFactory } from "./view.js";
import { Controller, ControllerEvent, Toy } from "../initializer.js";

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

let models: [string, string][]
let modelIndex = 1

export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gltf"
export const huds = {
    "monitor": "monitor-button"
}

export function wires(): Toy {
    return {
        gitHubRepo,
        huds,
        video: null,
        init: controller => init(controller, true)
    }
}

export async function init(toyController: Controller, wires: boolean = false) {
    const modelIndexResponse = await fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json")
    models = (await modelIndexResponse.json() as ModelIndexEntry[])
        .map(entry => [entry.name, `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${entry.name}/glTF/${entry.variants.glTF}`])
    models.unshift(
        ["ScalarFieldIn", new URL("/models/ScalarFieldIn.gltf", window.location.href).href],
        ["ScalarField", new URL("/models/ScalarField.gltf", window.location.href).href],
        ["ScalarFieldOut", new URL("/models/ScalarFieldOut.gltf", window.location.href).href],
        ["SculptTorso", new URL("/models/SculptTorso.gltf", window.location.href).href],
    )

    const canvas = gear.elementEvents("canvas");
    const modelRotation = new dragging.RotationDragging(
        () => view.modelMatrix, 
        () => aether.mat4.mul(view.projectionMatrix, view.viewMatrix), 
        4
    )
    const modelTranslation = new dragging.TranslationDragging(
        () => view.modelMatrix, 
        () => aether.mat4.mul(view.projectionMatrix, view.viewMatrix), 
        4
    )
    const modelScale = new dragging.ScaleDragging(
        () => view.modelMatrix, 
        4
    )
    const zoom = new dragging.ZoomDragging(() => [view.projectionMatrix, view.viewMatrix], 2)

    const pressedKey = new gear.Value((c: gear.Consumer<ControllerEvent>) => toyController.handler = e => {
        c(e)
        return false
    }).filter(e => e.down).map(e => e.key)

    const model = pressedKey
        .map(k => ['[', ']'].indexOf(k))
        .filter(i => i >= 0)
        .map(i => i * 2 - 1)
        .map(i => modelIndex = (modelIndex + i + models.length) % models.length)
        .defaultsTo(1)

    const cases = {
        lightPosition: new gear.Value<gear.Dragging>(),
        lightRadius: new gear.Value<gear.Dragging>(),
        color: new gear.Value<gear.Dragging>(),
        shininess: new gear.Value<gear.Dragging>(),
        fogginess: new gear.Value<gear.Dragging>(),
        modelRotation: new gear.Value<gear.Dragging>(),
        modelMove: new gear.Value<gear.Dragging>(),
        modelScale: new gear.Value<gear.Dragging>(),
        zoom: new gear.Value<gear.Dragging>(),
    }

    const keyMappings = {
        "m": cases.modelMove,
        "r": cases.modelRotation,
        "s": cases.modelScale,
        "z": cases.zoom,
        "c": cases.color,
        "h": cases.shininess,
        "d": cases.lightPosition,
        "l": cases.lightRadius,
        "f": cases.fogginess,
    }

    const mouseBinding = pressedKey
        .filter(k => k in keyMappings)
        .defaultsTo("r")
        .reduce((previous, current) => {
            control(previous).removeAttribute("style")
            control(current).setAttribute("style", "font-weight: bold")
            return current
        }, "r")

    canvas.dragging.value.switch(mouseBinding, keyMappings)

    const viewFactory = await newViewFactory(canvas.element.id, wires)
    const view = viewFactory({
        matModel: gear.Value.from(
                cases.modelRotation.then(gear.drag(modelRotation)),
                cases.modelMove.then(gear.drag(modelTranslation)),
                cases.modelScale.then(gear.drag(modelScale)),
                model.map(() => aether.mat4.identity())
            ),
        matProjection: cases.zoom.then(gear.drag(zoom)).map(([p, _]) => p), 
        matView: cases.zoom.then(gear.drag(zoom)).map(([_, v]) => v),
        color: cases.color
            .then(gear.drag(dragging.positionDragging))
            .map(positionToColor())
            .defaultsTo([0.8, 0.8, 0.8, 1.0]),
        lightPosition: cases.lightPosition
            .then(gear.drag(dragging.positionDragging))
            .map(p => aether.vec2.length(p) > 1 ? aether.vec2.unit(p) : p)
            .map(([x, y]) => aether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
            .map(toLightPosition)
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
    })

    const sizeManager = new gearx.CanvasSizeManager(true)
    sizeManager.observe(canvas.element as HTMLCanvasElement, () => view.resize())

    gear.text("model-name").value = model.map(i => models[i][0])
    gear.text("status").value = view.status

    model.flow(modelIndex)
    const frame = () => {
        view.draw()
        requestAnimationFrame(frame)
    }
    frame()

    function toLightPosition([x, y]: gear.PointerPosition) {
        const p: aether.Vec3 = [2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y)];
        return aether.vec3.add(aether.vec3.from(view.viewMatrix[3]), p);
    }

}

function control(previous: string) {
    return gearx.required(document.getElementById(`control-${previous}`))
}

function positionToColor(): gear.Mapper<gear.PointerPosition, aether.Vec4> {
    const third = 2 * Math.PI / 3
    const redVec: aether.Vec<2> = [1, 0];
    const greenVec: aether.Vec<2> = [Math.cos(third), Math.sin(third)];
    const blueVec: aether.Vec<2> = [Math.cos(2 * third), Math.sin(2 * third)];
    return vec => {
        const red = Math.min(2, 1 + aether.vec2.dot(vec, redVec)) / 2;
        const green = Math.min(2, 1 + aether.vec2.dot(vec, greenVec)) / 2;
        const blue = Math.min(2, 1 + aether.vec2.dot(vec, blueVec)) / 2;
        return [red, green, blue, 1.0];
    };
}
