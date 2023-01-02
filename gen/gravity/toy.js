var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether, gear } from '/gen/libs.js';
import * as dragging from '../utils/dragging.js';
import * as gpu from '../djee/gpu/index.js';
import * as misc from '../utils/misc.js';
import { newUniverse } from './universe.js';
import { newRenderer } from './renderer.js';
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gravity";
export const video = "https://youtu.be/BrZm6LlOQlI";
export const huds = {
    "monitor": "monitor-button"
};
export function init(controller) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpuDevice();
        const canvas = device.canvas("canvas", 4);
        const universe = yield newUniverse(device);
        const renderer = yield newRenderer(device, canvas);
        const pressedKey = new gear.Value((c) => controller.handler = e => {
            c(e);
            return false;
        }).filter(e => e.down).map(e => e.key);
        const pauseResumeAction = animation(universe, renderer);
        setupControls(canvas, universe, renderer, pressedKey);
        setupActions(universe, renderer, pauseResumeAction, pressedKey);
    });
}
function setupControls(canvas, universe, renderer, pressedKey) {
    const universeRotation = new gear.Value();
    const observerPosition = new gear.Value();
    const bodyPointedness = new gear.Value();
    const gravityConstant = new gear.Value();
    const radiusScale = new gear.Value();
    const zoom = new gear.Value();
    const keyMappings = {
        "r": universeRotation,
        "p": observerPosition,
        "z": zoom,
        "s": radiusScale,
        "g": gravityConstant,
        "b": bodyPointedness,
    };
    const controller = pressedKey
        .filter(k => k in keyMappings)
        .defaultsTo("r")
        .reduce((previous, current) => {
        control(previous).removeAttribute("style");
        control(current).setAttribute("style", "font-weight: bold");
        return current;
    }, "r");
    gear.elementEvents(canvas.element.id).dragging.value.switch(controller, keyMappings);
    universeRotation
        .then(gear.drag(new dragging.RotationDragging(() => renderer.modelMatrix, () => renderer.projectionViewMatrix)))
        .later()
        .attach(m => renderer.modelMatrix = m);
    observerPosition
        .then(gear.drag(new dragging.LinearDragging(() => renderer.viewMatrix[3][2], -64, -1, 16)))
        .map(z => aether.mat4.lookAt([0, 0, z]))
        .later()
        .attach(m => renderer.viewMatrix = m);
    bodyPointedness
        .then(gear.drag(new dragging.RatioDragging(() => universe.bodyPointedness, 0.001, 1000)))
        .later()
        .attach(p => universe.bodyPointedness = p);
    gravityConstant
        .then(gear.drag(new dragging.RatioDragging(() => universe.gravityConstant, 1, 10000)))
        .later()
        .attach(g => universe.gravityConstant = g);
    radiusScale
        .then(gear.drag(new dragging.RatioDragging(() => renderer.radiusScale, 0.001, 1)))
        .later()
        .attach(s => renderer.radiusScale = s);
    zoom
        .then(gear.drag(new dragging.RatioDragging(() => renderer.projectionMatrix[1][1], 0.01, 100)))
        .map(z => aether.mat4.projection(z, undefined, undefined, 2))
        .later()
        .attach(m => renderer.projectionMatrix = m);
}
function setupActions(universe, renderer, pauseResumeAction, pressedKey) {
    const collapse = new gear.Value();
    const kaboom = new gear.Value();
    const reset = new gear.Value();
    const pause = new gear.Value();
    const keyMappings = {
        "1": collapse,
        "2": kaboom,
        "3": reset,
        "4": pause,
    };
    const controller = pressedKey
        .map(k => k in keyMappings ? k : "")
        .defaultsTo("");
    pressedKey.switch(controller, keyMappings);
    pause.attach(pauseResumeAction);
    reset.attach(() => {
        renderer.modelMatrix = aether.mat4.identity();
        renderer.viewMatrix = aether.mat4.lookAt([0, 0, -24]);
        renderer.projectionMatrix = aether.mat4.projection(1, undefined, undefined, 2);
        renderer.radiusScale = 0.06;
    });
    collapse.attach(() => {
        universe.bodyPointedness = 0.1;
        universe.gravityConstant = 1000;
        universe.recreateUniverse();
    });
    kaboom.attach(() => {
        universe.bodyPointedness = 5;
        universe.gravityConstant = 25;
        universe.recreateUniverse(1);
    });
}
function control(previous) {
    return misc.required(document.getElementById(`control-${previous}`));
}
function animation(universe, renderer) {
    const freqMeter = misc.FrequencyMeter.create(1000, "freq-watch");
    const rendering = () => {
        renderer.render(universe);
        freqMeter.tick();
    };
    animate(rendering);
    const pauseResumeAction = animate(() => universe.tick());
    return pauseResumeAction;
}
function animate(frame) {
    const paused = [false];
    const callBack = time => {
        frame(time);
        if (!paused[0]) {
            requestAnimationFrame(callBack);
        }
    };
    requestAnimationFrame(callBack);
    return () => {
        paused[0] = !paused[0];
        if (!paused[0]) {
            requestAnimationFrame(callBack);
        }
    };
}
function gpuDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const gpuStatus = misc.required(document.getElementById("gpu-status"));
        try {
            const device = yield gpu.Device.instance();
            gpuStatus.innerHTML = "\u{1F60A} Supported! \u{1F389}";
            return device;
        }
        catch (e) {
            gpuStatus.innerHTML = "\u{1F62D} Not Supported!";
            throw e;
        }
    });
}
//# sourceMappingURL=toy.js.map