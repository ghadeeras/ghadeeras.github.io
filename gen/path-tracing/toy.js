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
import * as gear from "/gear/latest/index.js";
import * as misc from "../utils/misc.js";
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
        const scene = buildScene();
        const device = yield gpuDevice();
        const canvas = device.canvas("canvas", false);
        const recorder = new misc.CanvasRecorder(canvas.element);
        const tracer = yield Tracer.create(device, canvas, scene, canvas.format, "rgba32float");
        const denoiser = yield Denoiser.create(device, canvas.size, canvas.format, "rgba32float", canvas.format);
        const stacker = yield Stacker.create(device, canvas.size, tracer.uniformsBuffer, denoiser.normalsTexture, canvas.format, canvas.format);
        const state = {
            wasAnimating: false,
            animating: false,
            changingView: false,
            minLayersOnly: false,
            denoising: true,
            speed: aether.vec3.of(0, 0, 0),
            minLayersCount: 4,
        };
        const samplesPerPixelElement = misc.required(document.getElementById("spp"));
        const layersCountElement = misc.required(document.getElementById("layers"));
        const maxLayersCountElement = misc.required(document.getElementById("max-layers"));
        const denoisingElement = misc.required(document.getElementById("denoising"));
        const setSamplesPerPixel = (spp) => {
            tracer.samplesPerPixel = spp;
            samplesPerPixelElement.innerText = tracer.samplesPerPixel.toString();
        };
        const setLayersCount = (c) => {
            stacker.layersCount = c;
            layersCountElement.innerText = stacker.layersCount.toString();
        };
        const setMinLayersOnly = (b) => {
            state.minLayersOnly = b;
            maxLayersCountElement.innerText = b ? state.minLayersCount.toString() : "256";
        };
        const setMinLayersCount = (c) => {
            state.minLayersCount = c;
            setMinLayersOnly(state.minLayersOnly);
        };
        const setDenoising = (b) => {
            state.denoising = b;
            denoisingElement.innerText = b ? "on" : "off";
        };
        setSamplesPerPixel(Number.parseInt(misc.required(samplesPerPixelElement.textContent)));
        setLayersCount(Number.parseInt(misc.required(samplesPerPixelElement.textContent)));
        setMinLayersOnly(misc.required(maxLayersCountElement.textContent) != "256");
        setDenoising(misc.required(denoisingElement.textContent).toLowerCase() == "on");
        const handleKey = (e, down) => {
            const s = down ? 0.2 : 0;
            if (e.key == 'w') {
                state.speed[2] = -s;
                e.preventDefault();
            }
            else if (e.key == 's') {
                state.speed[2] = s;
                e.preventDefault();
            }
            else if (e.key == 'd') {
                state.speed[0] = s;
                e.preventDefault();
            }
            else if (e.key == 'a') {
                state.speed[0] = -s;
                e.preventDefault();
            }
            else if (e.key == 'e') {
                state.speed[1] = s;
                e.preventDefault();
            }
            else if (e.key == 'c') {
                state.speed[1] = -s;
                e.preventDefault();
            }
            else if (down && e.key >= '1' && e.key <= '8') {
                const count = Number.parseInt(e.key);
                const setter = e.altKey ? setMinLayersCount : setSamplesPerPixel;
                setter(count);
                e.preventDefault();
            }
            else if (down && e.key == 'l') {
                setMinLayersOnly(!state.minLayersOnly);
                e.preventDefault();
            }
            else if (down && e.key == 'n') {
                setDenoising(!state.denoising);
                e.preventDefault();
            }
            else if (down && e.key == 'r' && !e.ctrlKey) {
                recorder.startStop();
            }
        };
        window.onkeyup = e => handleKey(e, false);
        window.onkeydown = e => handleKey(e, true);
        canvas.element.onwheel = e => {
            state.changingView = true;
            e.preventDefault();
            tracer.focalRatio *= Math.exp(-Math.sign(e.deltaY) * 0.25);
        };
        gear.ElementEvents.create(canvas.element.id).dragging.value
            .then(gear.drag(new RotationDragging(() => aether.mat4.cast(tracer.matrix), () => aether.mat4.projection(1, Math.SQRT2))))
            .attach(m => {
            state.changingView = true;
            tracer.matrix = aether.mat3.from([
                ...aether.vec3.swizzle(m[0], 0, 1, 2),
                ...aether.vec3.swizzle(m[1], 0, 1, 2),
                ...aether.vec3.swizzle(m[2], 0, 1, 2),
            ]);
        });
        tracer.position = [36, 36, 36];
        const draw = () => {
            const velocity = aether.vec3.prod(state.speed, tracer.matrix);
            const speed = aether.vec3.length(velocity);
            state.wasAnimating = state.animating;
            state.animating = state.minLayersOnly || state.changingView || speed !== 0;
            state.changingView = false;
            render(setLayersCount, tracer, denoiser, stacker, canvas, state);
            if (speed > 0) {
                tracer.position = move(tracer.position, velocity, scene);
            }
            recorder.requestFrame();
        };
        const freqMeter = misc.FrequencyMeter.create(1000, "freq-watch");
        freqMeter.animateForever(draw);
    });
}
function render(setLayersCount, tracer, denoiser, stacker, canvas, state) {
    const device = canvas.device;
    const clearColor = { r: 0, g: 0, b: 0, a: 1 };
    setLayersCount(state.animating
        ? state.minLayersCount
        : state.wasAnimating
            ? 1
            : stacker.layersCount + 1);
    device.enqueueCommand("render", encoder => {
        const [colorsAttachment, normalsAttachment] = denoiser.attachments(clearColor, clearColor);
        if (stacker.layersCount > 64 || !state.denoising) {
            tracer.render(encoder, stacker.colorAttachment(clearColor), normalsAttachment);
        }
        else {
            tracer.render(encoder, colorsAttachment, normalsAttachment);
            denoiser.render(encoder, stacker.colorAttachment(clearColor));
        }
        if (stacker.layersCount >= state.minLayersCount) {
            stacker.render(encoder, canvas.attachment(clearColor));
        }
    });
}
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