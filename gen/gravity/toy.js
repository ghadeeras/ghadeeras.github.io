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
import { UniverseLayout } from './universe.js';
import * as meshRenderer from './renderer.mesh.js';
import * as pointsRenderer from './renderer.points.js';
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
    constructor(universe, visuals, engine, renderers) {
        this.universe = universe;
        this.visuals = visuals;
        this.engine = engine;
        this.renderers = renderers;
        this.gravityDragging = this.draggingTarget("gravity", dragging.RatioDragging.dragger(1, 10000));
        this.pointednessDragging = this.draggingTarget("pointedness", dragging.RatioDragging.dragger(0.001, 1000));
        this.radiusScaleDragging = this.draggingTarget("radiusScale", dragging.RatioDragging.dragger(0.001, 1));
        this.positionDragging = this.draggingTarget("position", dragging.LinearDragging.dragger(-64, -1, 16));
        this.zoomDragging = this.draggingTarget("zoom", dragging.RatioDragging.dragger(0.01, 100));
        this.rotationDragging = this.draggingTarget("modelMatrix", dragging.RotationDragging.dragger(() => this.visuals.projectionViewMatrix));
        this.currentRenderer = 0;
    }
    inputWiring(inputs, outputs, controller) {
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
                collapse: { onPressed: () => this.recreateCollapse() },
                kaboom: { onPressed: () => this.recreateKaboom() },
                reset: { onPressed: () => this.resetRendering() },
                pauseResume: { onPressed: () => controller.animationPaused = !controller.animationPaused },
                record: { onPressed: () => outputs.canvases.scene.recorder.startStop() },
                nextRenderer: { onPressed: () => this.currentRenderer = (this.currentRenderer + 1) % this.renderers.length },
                prevRenderer: { onPressed: () => this.currentRenderer = (this.currentRenderer - 1) % this.renderers.length }
            },
        };
    }
    outputWiring() {
        return {
            onRender: () => this.renderers[this.currentRenderer].render(this.universe),
            canvases: {
                scene: { onResize: () => this.resize() }
            },
        };
    }
    animate() { this.engine.move(this.universe); }
    get defaultDraggingTarget() {
        return this.rotationDragging;
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
        return gear.loops.draggingTarget(gear.property(this, key), dragger);
    }
    resize() {
        this.renderers.forEach(r => r.resize());
    }
    resetRendering() {
        this.visuals.modelMatrix = aether.mat4.identity();
        this.visuals.viewMatrix = aether.mat4.lookAt([0, 0, -24]);
        this.visuals.radiusScale = 0.06;
        this.visuals.zoom = 1;
        this.resize();
    }
    recreateKaboom() {
        this.universe.bodyPointedness = 5;
        this.universe.gravityConstant = 25;
        this.recreate(1);
    }
    recreateCollapse() {
        this.universe.bodyPointedness = 0.1;
        this.universe.gravityConstant = 1000;
        this.recreate();
    }
    recreate(universeRadius = 12) {
        const [bodyDescriptions, initialState] = createUniverse(this.universe.bodiesCount, universeRadius);
        this.universe.bodyDescriptions = bodyDescriptions;
        this.universe.state = initialState;
    }
    static loop() {
        return __awaiter(this, void 0, void 0, function* () {
            const device = yield gpuDevice();
            const limits = device.device.limits;
            const workgroupSize = Math.max(limits.maxComputeWorkgroupSizeX, limits.maxComputeWorkgroupSizeY, limits.maxComputeWorkgroupSizeZ);
            const canvas = Toy.descriptor.input.pointers.canvas.element;
            const universeLayout = new UniverseLayout(device);
            const universe = universeLayout.instance(...createUniverse(64 * workgroupSize));
            const visualsLayout = new VisualsLayout(device);
            const visuals = visualsLayout.instance();
            const engineLayout = new EngineLayout(universeLayout);
            const engine = yield newEngine(engineLayout, workgroupSize);
            const renderer1 = yield meshRenderer.newRenderer(device, canvas, visuals);
            const renderer2 = yield pointsRenderer.newRenderer(device, canvas, visuals);
            return gear.loops.newLoop(new Toy(universe, visuals, engine, [renderer1, renderer2]), Toy.descriptor);
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
                virtualKeys: "#control-r",
                physicalKeys: [["KeyR"]],
            },
            position: {
                virtualKeys: "#control-p",
                physicalKeys: [["KeyP"]],
            },
            zoom: {
                virtualKeys: "#control-z",
                physicalKeys: [["KeyZ"]],
            },
            radiusScale: {
                virtualKeys: "#control-s",
                physicalKeys: [["KeyS"]],
            },
            gravity: {
                virtualKeys: "#control-g",
                physicalKeys: [["KeyG"]],
            },
            pointedness: {
                virtualKeys: "#control-b",
                physicalKeys: [["KeyB"]],
            },
            collapse: {
                virtualKeys: "#control-1",
                physicalKeys: [["Digit1"]],
            },
            kaboom: {
                virtualKeys: "#control-2",
                physicalKeys: [["Digit2"]],
            },
            reset: {
                virtualKeys: "#control-3",
                physicalKeys: [["Digit3"]],
            },
            pauseResume: {
                virtualKeys: "#control-4",
                physicalKeys: [["Digit4"]],
            },
            record: {
                virtualKeys: "#control-5",
                physicalKeys: [["Digit5"]],
            },
            nextRenderer: {
                virtualKeys: "#control-right",
                physicalKeys: [["ArrowRight"]]
            },
            prevRenderer: {
                virtualKeys: "#control-left",
                physicalKeys: [["ArrowLeft"]]
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