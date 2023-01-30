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
import { UniverseLayout } from './universe.js';
import { newRenderer } from './renderer.js';
import { EngineLayout, newEngine } from './physics.js';
import { VisualsLayout } from './visuals.js';
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gravity";
export const video = "https://youtu.be/BrZm6LlOQlI";
export const huds = {
    "monitor": "monitor-button"
};
export function init(controller) {
    return __awaiter(this, void 0, void 0, function* () {
        const device = yield gpuDevice();
        const canvas = device.canvas("canvas", 4);
        const universeLayout = new UniverseLayout(device);
        const universe = universeLayout.instance(...createUniverse(16384));
        const visualsLayout = new VisualsLayout(device);
        const visuals = visualsLayout.instance();
        const engineLayout = new EngineLayout(universeLayout);
        const engine = yield newEngine(engineLayout);
        const renderer = yield newRenderer(device, canvas, visuals);
        const pressedKey = new gear.Value((c) => controller.handler = e => {
            c(e);
            return false;
        }).filter(e => e.down).map(e => e.key);
        const pauseResumeAction = animation(universe, renderer, engine);
        setupControls(canvas, universe, visuals, pressedKey);
        setupActions(universe, renderer, visuals, pauseResumeAction, pressedKey);
    });
}
function setupControls(canvas, universe, visuals, pressedKey) {
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
        .then(gear.drag(new dragging.RotationDragging(() => visuals.modelMatrix, () => visuals.projectionViewMatrix)))
        .attach(m => visuals.modelMatrix = m);
    observerPosition
        .then(gear.drag(new dragging.LinearDragging(() => visuals.viewMatrix[3][2], -64, -1, 16)))
        .map(z => aether.mat4.lookAt([0, 0, z]))
        .attach(m => visuals.viewMatrix = m);
    bodyPointedness
        .then(gear.drag(new dragging.RatioDragging(() => universe.bodyPointedness, 0.001, 1000)))
        .attach(p => universe.bodyPointedness = p);
    gravityConstant
        .then(gear.drag(new dragging.RatioDragging(() => universe.gravityConstant, 1, 10000)))
        .attach(g => universe.gravityConstant = g);
    radiusScale
        .then(gear.drag(new dragging.RatioDragging(() => visuals.radiusScale, 0.001, 1)))
        .attach(s => visuals.radiusScale = s);
    zoom
        .then(gear.drag(new dragging.RatioDragging(() => visuals.zoom, 0.01, 100)))
        .attach(z => visuals.zoom = z);
}
function setupActions(universe, renderer, visuals, pauseResumeAction, pressedKey) {
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
        visuals.modelMatrix = aether.mat4.identity();
        visuals.viewMatrix = aether.mat4.lookAt([0, 0, -24]);
        visuals.radiusScale = 0.06;
        visuals.zoom = 1;
        renderer.resize();
    });
    collapse.attach(() => {
        universe.bodyPointedness = 0.1;
        universe.gravityConstant = 1000;
        recreate(universe);
    });
    kaboom.attach(() => {
        universe.bodyPointedness = 5;
        universe.gravityConstant = 25;
        recreate(universe, 1);
    });
}
function control(previous) {
    return misc.required(document.getElementById(`control-${previous}`));
}
function animation(universe, renderer, engine) {
    const freqMeter = misc.FrequencyMeter.create(1000, "freq-watch");
    const rendering = () => {
        renderer.render(universe);
        freqMeter.tick();
    };
    animate(rendering);
    const pauseResumeAction = animate(() => engine.move(universe));
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
function recreate(universe, universeRadius = 12) {
    const [bodyDescriptions, initialState] = createUniverse(universe.bodiesCount, universeRadius);
    universe.bodyDescriptions = bodyDescriptions;
    universe.state = initialState;
}
function createUniverse(bodiesCount, universeRadius = 12) {
    const descriptions = [];
    const initialState = [];
    for (let i = 0; i < bodiesCount; i++) {
        const mass = skewDown(Math.random(), 16) * 0.999 + 0.001;
        const radius = Math.pow(mass, (1 / 3));
        const p = randomVector(universeRadius);
        const v = randomVector(0.001 / mass);
        descriptions.push({ mass: 100 * mass, radius });
        initialState.push({ position: p, velocity: v });
    }
    return [descriptions, initialState];
}
function randomVector(radius) {
    const cosYA = 1 - 2 * Math.random();
    const sinYA = Math.sqrt(1 - cosYA * cosYA);
    const xa = 2 * Math.PI * Math.random();
    const r = radius * skewUp(Math.random(), 100);
    const ry = r * sinYA;
    const x = ry * Math.cos(xa);
    const y = r * (cosYA);
    const z = ry * Math.sin(xa);
    return [x, y, z];
}
function skewUp(x, s) {
    return skewDown(x, 1 / s);
}
function skewDown(x, s) {
    return Math.pow(x, s);
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