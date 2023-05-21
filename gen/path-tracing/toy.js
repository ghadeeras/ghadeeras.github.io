var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as gpu from "../djee/gpu/index.js";
import * as aether from "/aether/latest/index.js";
import * as gearx from "../utils/gear.js";
import { RotationDragging } from "../utils/dragging.js";
import { Stacker } from "./stacker.js";
import { Tracer } from "./tracer.js";
import { volume } from "./scene.js";
import { buildScene } from "./scene-builder.js";
import { Denoiser } from "./denoiser.js";
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/path-tracing";
export const video = "https://youtu.be/xlMvArfR2do";
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
    constructor(canvas, tracer, denoiser, stacker, scene) {
        this.canvas = canvas;
        this.tracer = tracer;
        this.denoiser = denoiser;
        this.stacker = stacker;
        this.scene = scene;
        this._minLayersOnly = false;
        this._denoising = true;
        this._minLayersCount = 4;
        this.wasAnimating = false;
        this.animating = false;
        this.changingView = false;
        this.speeds = [[0, 0], [0, 0], [0, 0]];
        this.samplesPerPixelElement = gearx.required(document.getElementById("spp"));
        this.layersCountElement = gearx.required(document.getElementById("layers"));
        this.maxLayersCountElement = gearx.required(document.getElementById("max-layers"));
        this.denoisingElement = gearx.required(document.getElementById("denoising"));
        this.samplesPerPixel = Number.parseInt(gearx.required(this.samplesPerPixelElement.textContent));
        this.layersCount = Number.parseInt(gearx.required(this.samplesPerPixelElement.textContent));
        this.minLayersOnly = gearx.required(this.maxLayersCountElement.textContent) != "256";
        this.denoising = gearx.required(this.denoisingElement.textContent).toLowerCase() == "on";
        tracer.position = [36, 36, 36];
    }
    static loop() {
        return __awaiter(this, void 0, void 0, function* () {
            const scene = buildScene();
            const device = yield gpuDevice();
            const canvas = device.canvas(Toy.descriptor.output.canvases.scene.element);
            const tracer = yield Tracer.create(device, canvas, scene, canvas.format, "rgba32float");
            const denoiser = yield Denoiser.create(device, canvas.size, canvas.format, "rgba32float", canvas.format);
            const stacker = yield Stacker.create(device, canvas.size, tracer.uniformsBuffer, denoiser.normalsTexture, canvas.format, canvas.format);
            return gearx.newLoop(new Toy(canvas, tracer, denoiser, stacker, scene), Toy.descriptor);
        });
    }
    inputWiring(_, outputs) {
        return {
            pointers: {
                canvas: {
                    defaultDraggingTarget: gearx.draggingTarget(gearx.property(this, "viewMatrix"), RotationDragging.dragger(() => aether.mat4.projection(1, Math.SQRT2)))
                }
            },
            keys: {
                forward: {
                    onPressed: () => this.speeds[2][0] = 0.2,
                    onReleased: () => this.speeds[2][0] = 0.0,
                },
                backward: {
                    onPressed: () => this.speeds[2][1] = 0.2,
                    onReleased: () => this.speeds[2][1] = 0.0,
                },
                right: {
                    onPressed: () => this.speeds[0][0] = 0.2,
                    onReleased: () => this.speeds[0][0] = 0.0,
                },
                left: {
                    onPressed: () => this.speeds[0][1] = 0.2,
                    onReleased: () => this.speeds[0][1] = 0.0,
                },
                up: {
                    onPressed: () => this.speeds[1][0] = 0.2,
                    onReleased: () => this.speeds[1][0] = 0.0,
                },
                down: {
                    onPressed: () => this.speeds[1][1] = 0.2,
                    onReleased: () => this.speeds[1][1] = 0.0,
                },
                layering: {
                    onPressed: () => this.minLayersOnly = !this.minLayersOnly
                },
                denoising: {
                    onPressed: () => this.denoising = !this.denoising
                },
                recording: {
                    onPressed: () => outputs.canvases.scene.recorder.startStop()
                },
                incSPP: {
                    onPressed: () => this.samplesPerPixel++
                },
                decSPP: {
                    onPressed: () => this.samplesPerPixel--
                },
                incLayers: {
                    onPressed: () => this.minLayersCount++
                },
                decLayers: {
                    onPressed: () => this.minLayersCount--
                },
            }
        };
    }
    outputWiring() {
        return {
            onRender: () => this.render(),
        };
    }
    animate() {
        let v = [
            this.speeds[0][0] - this.speeds[0][1],
            this.speeds[1][0] - this.speeds[1][1],
            this.speeds[2][1] - this.speeds[2][0],
        ];
        const velocity = aether.vec3.prod(v, this.tracer.matrix);
        const speed = aether.vec3.length(velocity);
        this.wasAnimating = this.animating;
        this.animating = this.minLayersOnly || this.changingView || speed !== 0;
        this.changingView = false;
        if (speed > 0) {
            this.tracer.position = move(this.tracer.position, velocity, this.scene);
        }
    }
    render() {
        const device = this.canvas.device;
        const clearColor = { r: 0, g: 0, b: 0, a: 1 };
        this.layersCount =
            this.animating
                ? this._minLayersCount
                : this.wasAnimating
                    ? 1
                    : this.stacker.layersCount + 1;
        device.enqueueCommand("render", encoder => {
            const [colorsAttachment, normalsAttachment] = this.denoiser.attachments(clearColor, clearColor);
            if (this.stacker.layersCount > 64 || !this._denoising) {
                this.tracer.render(encoder, this.stacker.colorAttachment(clearColor), normalsAttachment);
            }
            else {
                this.tracer.render(encoder, colorsAttachment, normalsAttachment);
                this.denoiser.render(encoder, this.stacker.colorAttachment(clearColor));
            }
            if (this.stacker.layersCount >= this._minLayersCount) {
                this.stacker.render(encoder, this.canvas.attachment(clearColor));
            }
        });
    }
    get viewMatrix() {
        return aether.mat4.cast(this.tracer.matrix);
    }
    set viewMatrix(m) {
        this.changingView = true;
        this.tracer.matrix = aether.mat3.from([
            ...aether.vec3.from(m[0]),
            ...aether.vec3.from(m[1]),
            ...aether.vec3.from(m[2]),
        ]);
    }
    get samplesPerPixel() {
        return this.tracer.samplesPerPixel;
    }
    set samplesPerPixel(spp) {
        this.tracer.samplesPerPixel = Math.min(Math.max(1, spp), 8);
        this.samplesPerPixelElement.innerText = this.tracer.samplesPerPixel.toString();
    }
    set layersCount(c) {
        this.stacker.layersCount = c;
        this.layersCountElement.innerText = this.stacker.layersCount.toString();
    }
    get minLayersOnly() {
        return this._minLayersOnly;
    }
    set minLayersOnly(b) {
        this._minLayersOnly = b;
        this.maxLayersCountElement.innerText = b ? this._minLayersCount.toString() : "256";
    }
    get minLayersCount() {
        return this._minLayersCount;
    }
    set minLayersCount(c) {
        this._minLayersCount = Math.min(Math.max(1, c), 8);
        this.minLayersOnly = this.minLayersOnly;
    }
    get denoising() {
        return this._denoising;
    }
    set denoising(b) {
        this._denoising = b;
        this.denoisingElement.innerText = b ? "on" : "off";
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
            forward: {
                alternatives: [["KeyW"], ["ArrowUp"]],
                virtualKey: "#control-forward",
            },
            backward: {
                alternatives: [["KeyS"], ["ArrowDown"]],
                virtualKey: "#control-backward",
            },
            right: {
                alternatives: [["KeyD"], ["ArrowRight"]],
                virtualKey: "#control-right",
            },
            left: {
                alternatives: [["KeyA"], ["ArrowLeft"]],
                virtualKey: "#control-left",
            },
            up: {
                alternatives: [["KeyE"], ["PageUp"]],
                virtualKey: "#control-up",
            },
            down: {
                alternatives: [["KeyC"], ["PageDown"]],
                virtualKey: "#control-down",
            },
            layering: {
                alternatives: [["KeyL"]],
                virtualKey: "#control-layering",
            },
            denoising: {
                alternatives: [["KeyN"]],
                virtualKey: "#control-denoising",
            },
            recording: {
                alternatives: [["KeyR"]],
                virtualKey: "#control-recording",
            },
            incSPP: {
                alternatives: [["BracketRight"]],
                virtualKey: "#control-inc-spp",
            },
            decSPP: {
                alternatives: [["BracketLeft"]],
                virtualKey: "#control-dec-spp",
            },
            incLayers: {
                alternatives: [["AltRight", "BracketRight"], ["AltLeft", "BracketRight"]],
                virtualKey: "#control-inc-layers",
            },
            decLayers: {
                alternatives: [["AltRight", "BracketLeft"], ["AltLeft", "BracketLeft"]],
                virtualKey: "#control-dec-layers",
            },
        }
    },
    output: {
        canvases: {
            scene: {
                element: "canvas"
            }
        },
        fps: {
            element: "freq-watch",
            periodInMilliseconds: 1000
        },
        styling: {
            pressedButton: "pressed"
        },
    },
};
function move(position, velocity, scene) {
    let safeV = safeVelocity(position, velocity, scene);
    let power = aether.vec3.lengthSquared(safeV);
    if (power == 0) {
        for (let c = 1; c < 7; c++) {
            const x = c & 1;
            const y = (c >> 1) & 1;
            const z = (c >> 2) & 1;
            const v = safeVelocity(position, aether.vec3.mul(velocity, [x, y, z]), scene);
            const p = aether.vec3.lengthSquared(v);
            if (p > power) {
                safeV = v;
                power = p;
            }
        }
    }
    return aether.vec3.add(position, safeV);
}
function safeVelocity(position, velocity, scene) {
    const currentVolume = volumeAround(position);
    const nextPosition = aether.vec3.add(position, velocity);
    const nextVolume = volumeAround(nextPosition);
    const boxes = scene.volumeBoxes(nextVolume);
    const shortestTimeDistance = boxes
        .filter(b => intersect(b.volume, nextVolume))
        .map(box => timeDistance(currentVolume, box.volume, velocity))
        .reduce((d1, d2) => Math.min(d1, d2), 1);
    return aether.vec3.scale(velocity, shortestTimeDistance);
}
function intersect(v1, v2) {
    return aether.vec3.sub(aether.vec3.min(v1.max, v2.max), aether.vec3.max(v1.min, v2.min)).every(c => c > 0);
}
function volumeAround(position) {
    return volume(aether.vec3.sub(position, [0.5, 0.5, 0.5]), aether.vec3.add(position, [0.5, 0.5, 0.5]));
}
function timeDistance(v1, v2, velocity) {
    const gap = [
        velocity[0] >= 0 ? v2.min[0] - v1.max[0] : v2.max[0] - v1.min[0],
        velocity[1] >= 0 ? v2.min[1] - v1.max[1] : v2.max[1] - v1.min[1],
        velocity[2] >= 0 ? v2.min[2] - v1.max[2] : v2.max[2] - v1.min[2],
    ];
    const distances = aether.vec3.div(gap, velocity).map(c => !Number.isNaN(c) && c >= 0 ? c : 1);
    return Math.min(...distances);
}
function gpuDevice() {
    return __awaiter(this, void 0, void 0, function* () {
        const gpuStatus = gearx.required(document.getElementById("gpu-status"));
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