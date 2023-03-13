var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { aether } from '/gen/libs.js';
import * as gear from '../utils/gear.js';
import * as dragging from '../utils/dragging.js';
import * as gpu from '../djee/gpu/index.js';
import { UniverseLayout } from './universe.js';
import { newRenderer } from './renderer.js';
import { EngineLayout, newEngine } from './physics.js';
import { VisualsLayout } from './visuals.js';
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/gravity";
export const video = "https://youtu.be/BrZm6LlOQlI";
export const huds = {
    "monitor": "monitor-button"
};
export function init() {
    return __awaiter(this, void 0, void 0, function* () {
        const loop = yield Toy.loop();
        loop.run();
    });
}
class Toy {
    constructor(gpuCanvas, universe, visuals, engine, renderer) {
        this.gpuCanvas = gpuCanvas;
        this.universe = universe;
        this.visuals = visuals;
        this.engine = engine;
        this.renderer = renderer;
        this.gravityDragging = this.draggingTarget("gravity", dragging.RatioDragging.dragger(1, 10000));
        this.pointednessDragging = this.draggingTarget("pointedness", dragging.RatioDragging.dragger(0.001, 1000));
        this.radiusScaleDragging = this.draggingTarget("radiusScale", dragging.RatioDragging.dragger(0.001, 1));
        this.positionDragging = this.draggingTarget("position", dragging.LinearDragging.dragger(-64, -1, 16));
        this.zoomDragging = this.draggingTarget("zoom", dragging.RatioDragging.dragger(0.01, 100));
        this.rotationDragging = this.draggingTarget("modelMatrix", dragging.RotationDragging.dragger(() => this.visuals.projectionViewMatrix));
    }
    inputWiring(inputs, controller) {
        return {
            pointers: {
                canvas: {
                    defaultDraggingTarget: this.rotationDragging
                }
            },
            keys: {
                rotation: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.rotationDragging },
                position: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.positionDragging },
                zoom: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.zoomDragging },
                radiusScale: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.radiusScaleDragging },
                gravity: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.gravityDragging },
                pointedness: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.pointednessDragging },
                collapse: { onPressed: () => recreateCollapse(this.universe) },
                kaboom: { onPressed: () => recreateKaboom(this.universe) },
                reset: { onPressed: () => resetRendering(this.visuals, this.renderer) },
                pauseResume: { onPressed: () => controller.animationPaused = !controller.animationPaused },
            },
        };
    }
    outputWiring() {
        return {
            onRender: () => this.renderer.render(this.universe),
            canvases: {
                scene: { onResize: () => this.renderer.resize() }
            },
        };
    }
    animate() { this.engine.move(this.universe); }
    get defaultDraggingTarget() {
        return this.rotationDragging;
    }
    get element() {
        return this.gpuCanvas.element;
    }
    get gravity() { return this.universe.gravityConstant; }
    set gravity(g) { this.universe.gravityConstant = g; }
    get pointedness() { return this.universe.bodyPointedness; }
    set pointedness(p) { this.universe.bodyPointedness = p; }
    get radiusScale() { return this.visuals.radiusScale; }
    set radiusScale(s) { this.visuals.radiusScale = s; }
    get position() { return this.visuals.viewMatrix[3][2]; }
    set position(z) { this.visuals.viewMatrix = aether.mat4.lookAt([0, 0, z]); }
    get zoom() { return this.visuals.zoom; }
    set zoom(z) { this.visuals.zoom = z; }
    get modelMatrix() { return this.visuals.modelMatrix; }
    set modelMatrix(m) { this.visuals.modelMatrix = m; }
    draggingTarget(key, dragger) {
        return gear.draggingTarget(gear.property(this, key), dragger);
    }
    static loop() {
        return __awaiter(this, void 0, void 0, function* () {
            const device = yield gpuDevice();
            const canvas = device.canvas(Toy.descriptor.input.pointers.canvas.element, 4);
            const universeLayout = new UniverseLayout(device);
            const universe = universeLayout.instance(...createUniverse(16384));
            const visualsLayout = new VisualsLayout(device);
            const visuals = visualsLayout.instance();
            const engineLayout = new EngineLayout(universeLayout);
            const engine = yield newEngine(engineLayout);
            const renderer = yield newRenderer(device, canvas, visuals);
            return gear.newLoop(new Toy(canvas, universe, visuals, engine, renderer), Toy.descriptor);
        });
    }
}
Toy.descriptor = {
    input: {
        pointers: {
            canvas: {
                element: "canvas",
            }
        },
        keys: {
            rotation: {
                virtualKey: "#control-r",
                alternatives: [["KeyR"]],
            },
            position: {
                virtualKey: "#control-p",
                alternatives: [["KeyP"]],
            },
            zoom: {
                virtualKey: "#control-z",
                alternatives: [["KeyZ"]],
            },
            radiusScale: {
                virtualKey: "#control-s",
                alternatives: [["KeyS"]],
            },
            gravity: {
                virtualKey: "#control-g",
                alternatives: [["KeyG"]],
            },
            pointedness: {
                virtualKey: "#control-b",
                alternatives: [["KeyB"]],
            },
            collapse: {
                virtualKey: "#control-1",
                alternatives: [["Digit1"]],
            },
            kaboom: {
                virtualKey: "#control-2",
                alternatives: [["Digit2"]],
            },
            reset: {
                virtualKey: "#control-3",
                alternatives: [["Digit3"]],
            },
            pauseResume: {
                virtualKey: "#control-4",
                alternatives: [["Digit4"]],
            },
        },
    },
    output: {
        canvases: {
            scene: {
                element: "canvas"
            }
        },
        styling: {
            pressedButton: "pressed"
        },
        fps: {
            element: "freq-watch"
        }
    },
};
function resetRendering(visuals, renderer) {
    visuals.modelMatrix = aether.mat4.identity();
    visuals.viewMatrix = aether.mat4.lookAt([0, 0, -24]);
    visuals.radiusScale = 0.06;
    visuals.zoom = 1;
    renderer.resize();
}
function recreateKaboom(universe) {
    universe.bodyPointedness = 5;
    universe.gravityConstant = 25;
    recreate(universe, 1);
}
function recreateCollapse(universe) {
    universe.bodyPointedness = 0.1;
    universe.gravityConstant = 1000;
    recreate(universe);
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
        const gpuStatus = gear.required(document.getElementById("gpu-status"));
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