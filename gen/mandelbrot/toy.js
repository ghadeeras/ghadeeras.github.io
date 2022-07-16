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
import { view } from "./view.js";
import { positionDragging } from "../utils/dragging.js";
let audioContext;
export function init() {
    window.onload = () => doInit();
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const mandelbrotView = yield view(false, "canvas-gl", [-0.75, 0], 2);
        const juliaView = yield view(true, "julia-gl", [0, 0], 4);
        const toComplexNumber = (p) => aether.vec2.add(aether.vec2.scale(p, mandelbrotView.scale), mandelbrotView.center);
        const transformation = transformationTarget(mandelbrotView);
        const color = colorTarget(mandelbrotView, juliaView);
        const intensity = intensityTarget(mandelbrotView, juliaView);
        const palette = paletteTarget(mandelbrotView, juliaView);
        const julia = juliaTarget(juliaView);
        const canvas = gear.ElementEvents.create("canvas-gl");
        const mouseBinding = mouseBindingValue();
        const cases = {
            move: new gear.Value(),
            zoom: new gear.Value(),
            color: new gear.Value(),
            intensity: new gear.Value(),
            palette: new gear.Value(),
            julia: new gear.Value(),
        };
        canvas.dragging.value.switch(mouseBinding, cases);
        transformation.value = gear.Value.from(cases.move.then(gear.drag(new Move(mandelbrotView))), cases.zoom.then(gear.drag(new Zoom(mandelbrotView)))).defaultsTo(mandelbrotView);
        color.value = cases.color
            .then(gear.drag(positionDragging))
            .map(([x, y]) => aether.vec2.of(x + 1, (y + 1) / 2))
            .defaultsTo([mandelbrotView.hue, mandelbrotView.saturation]);
        intensity.value = cases.intensity
            .then(gear.drag(positionDragging))
            .map(([_, y]) => (y + 1) / 2)
            .defaultsTo(mandelbrotView.intensity);
        palette.value = cases.palette
            .then(gear.drag(positionDragging))
            .map(([_, y]) => y * 2)
            .defaultsTo(mandelbrotView.palette);
        julia.value = cases.julia
            .then(gear.drag(positionDragging))
            .map(toComplexNumber)
            .defaultsTo(juliaView.juliaNumber);
        const clickPos = canvas.pointerDown.value.map(canvas.positionNormalizer);
        gear.text("clickPos").value = clickPos
            .map(pos => toString(pos, 9))
            .defaultsTo(toString([0, 0], 9));
        clickPos
            .then(gear.flowSwitch(mouseBinding.map(v => v === "music")))
            .map(toComplexNumber)
            .attach(play);
    });
}
function juliaTarget(juliaView) {
    return new gear.Target(c => {
        juliaView.juliaNumber = c;
    });
}
function paletteTarget(mandelbrotView, juliaView) {
    const paletteWatch = text("palette");
    const palette = new gear.Target(p => {
        const palette = p > 0.75 ? 1 : p < -0.75 ? 0 : (p + 0.75) / 1.5;
        mandelbrotView.palette = palette;
        juliaView.palette = palette;
        paletteWatch(palette.toPrecision(3));
    });
    return palette;
}
function intensityTarget(mandelbrotView, juliaView) {
    const intensityWatch = text("intensity");
    const intensity = new gear.Target(intensity => {
        mandelbrotView.intensity = intensity;
        juliaView.intensity = intensity;
        intensityWatch(intensity.toPrecision(3));
    });
    return intensity;
}
function colorTarget(mandelbrotView, juliaView) {
    const hueWatch = text("hue");
    const saturationWatch = text("saturation");
    const color = new gear.Target(color => {
        const [hue, saturation] = color;
        mandelbrotView.setColor(hue, saturation);
        juliaView.setColor(hue, saturation);
        hueWatch(hue.toPrecision(3));
        saturationWatch(saturation.toPrecision(3));
    });
    return color;
}
function transformationTarget(mandelbrotView) {
    const centerWatch = text("center");
    const scaleWatch = text("scale");
    const transformation = new gear.Target(t => {
        mandelbrotView.scale = t.scale;
        mandelbrotView.center = t.center;
        centerWatch(toString(t.center));
        scaleWatch(t.scale.toPrecision(3));
    });
    return transformation;
}
function mouseBindingValue() {
    const mouseBinding = gear.readableValue("mouse-binding");
    const mouseBindingElement = document.getElementById("mouse-binding");
    mouseBindingElement.onkeyup = mouseBindingElement.onkeydown = e => {
        e.preventDefault();
    };
    window.onkeypress = (e) => {
        const key = e.key.toUpperCase();
        const act = action(key);
        if (act != null) {
            mouseBindingElement.value = act;
            mouseBinding.flow(act);
        }
    };
    return mouseBinding.defaultsTo("move");
}
function text(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id '${elementId}' not found!`);
    }
    const update = [null];
    return s => {
        if (update[0] == null) {
            setTimeout(() => {
                var _a;
                element.innerText = (_a = update[0]) !== null && _a !== void 0 ? _a : element.innerText;
                update[0] = null;
            }, 100);
        }
        update[0] = s;
    };
}
function toString(v, precision = 3) {
    const [x, y] = v.map(c => c.toPrecision(precision));
    return `(${x}, ${y})`;
}
function play(c) {
    if (audioContext == null) {
        audioContext = new window.AudioContext({ sampleRate: 9450 });
    }
    const audioBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate);
    const channel1 = audioBuffer.getChannelData(0);
    const channel2 = audioBuffer.getChannelData(1);
    let sum1 = 0;
    let sum2 = 0;
    let z = [0, 0];
    for (let i = 0; i < audioBuffer.length && aether.vec2.length(z) < 2.0; i++) {
        const [x, y] = z;
        z = aether.vec2.add([x * x - y * y, 2 * x * y], c);
        channel1[i] = z[0] / 2;
        channel2[i] = z[1] / 2;
        sum1 += channel1[i];
        sum2 += channel2[i];
    }
    if (aether.vec2.length(z) < 2.0) {
        const avg1 = sum1 / channel1.length;
        const avg2 = sum2 / channel2.length;
        for (let i = 0; i < audioBuffer.length; i++) {
            const attenuation = Math.pow(1 - i / audioBuffer.length, 2);
            channel1[i] = attenuation * (channel1[i] - avg1);
            channel2[i] = attenuation * (channel2[i] - avg2);
        }
        playBuffer(audioContext, audioBuffer);
    }
}
function playBuffer(audioContext, audioBuffer) {
    const source = audioContext.createBufferSource();
    source.channelCount = 2;
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
}
function action(key) {
    switch (key.toUpperCase()) {
        case "M": return "move";
        case "Z": return "zoom";
        case "C": return "color";
        case "I": return "intensity";
        case "P": return "palette";
        case "J": return "julia";
        case "N": return "music";
        default: return null;
    }
}
class Zoom {
    constructor(view) {
        this.view = view;
    }
    currentValue() {
        return {
            scale: this.view.scale,
            center: this.view.center
        };
    }
    mapper(value, from) {
        return to => {
            const delta = calculateDelta(from, to);
            const power = -delta[1];
            const factor = Math.pow(16, power);
            return power == 0 ? value : {
                scale: value.scale * factor,
                center: aether.vec2.sub(value.center, aether.vec2.scale(calculateDelta([0, 0], from, value.scale), factor - 1))
            };
        };
    }
    finalize(value) {
        return value;
    }
}
class Move {
    constructor(view) {
        this.view = view;
    }
    currentValue() {
        return {
            scale: this.view.scale,
            center: this.view.center
        };
    }
    mapper(value, from) {
        return to => {
            const delta = calculateDelta(from, to, value.scale);
            return {
                scale: value.scale,
                center: aether.vec2.max(aether.vec2.min(aether.vec2.sub(value.center, delta), [+4, +4]), [-4, -4])
            };
        };
    }
    finalize(value) {
        return value;
    }
}
function calculateDelta(pos1, pos2, scale = 1) {
    return aether.vec2.scale(aether.vec2.sub(pos2, pos1), scale);
}
//# sourceMappingURL=toy.js.map