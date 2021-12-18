var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ether, gear } from '/gen/libs.js';
import * as dragging from '../utils/dragging.js';
import * as gpu from '../djee/gpu/index.js';
import { newUniverse } from './universe.js';
import { newRenderer } from './renderer.js';
import { required } from '../utils/misc.js';
export function init() {
    window.onload = doInit;
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpuDevice();
        const canvas = device.canvas("canvas-gl");
        const universe = yield newUniverse(device);
        const renderer = yield newRenderer(device, canvas);
        const pauseResumeAction = animation(universe, renderer);
        setupControls(canvas, universe, renderer);
        setupActions(universe, renderer, pauseResumeAction);
    });
}
function setupControls(canvas, universe, renderer) {
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
    const controller = new gear.Value((c) => window.onkeyup = c)
        .map(e => e.key.toLowerCase())
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
        .map(z => ether.mat4.lookAt([0, 0, z]))
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
        .then(gear.drag(new dragging.RatioDragging(() => renderer.projectionMatrix[0][0], 0.01, 100)))
        .map(z => ether.mat4.projection(z))
        .later()
        .attach(m => renderer.projectionMatrix = m);
}
function setupActions(universe, renderer, pauseResumeAction) {
    action("pause").onclick = pauseResumeAction;
    action("reset").onclick = () => {
        renderer.modelMatrix = ether.mat4.identity();
        renderer.viewMatrix = ether.mat4.lookAt([0, 0, -24]);
        renderer.projectionMatrix = ether.mat4.projection();
        renderer.radiusScale = 0.05;
    };
    action("collapse").onclick = () => {
        universe.bodyPointedness = 0.1;
        universe.gravityConstant = 1000;
        universe.recreateUniverse();
    };
    action("kaboom").onclick = () => {
        universe.bodyPointedness = 10;
        universe.gravityConstant = 100;
        universe.recreateUniverse(1);
    };
}
function control(previous) {
    return required(document.getElementById(`control-${previous}`));
}
function action(previous) {
    return required(document.getElementById(`action-${previous}`));
}
function animation(universe, renderer) {
    const rendering = throttled(60, () => renderer.render(universe));
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
function throttled(freqInHz, logic) {
    const periodInMilliseconds = 1000 / freqInHz;
    const lastTime = [performance.now()];
    return time => {
        const t = time !== null && time !== void 0 ? time : performance.now();
        const elapsed = t - lastTime[0];
        if (elapsed > periodInMilliseconds) {
            logic();
            lastTime[0] = t - (elapsed % periodInMilliseconds);
        }
    };
}
function gpuDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const gpuStatus = required(document.getElementById("gpu-status"));
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