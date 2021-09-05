var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { view } from "./view.js";
import * as Gear from "../gear/all.js";
import { vec2 } from "../../ether/latest/index.js";
let audioContext = null;
let center = [-0.75, 0];
let scale = 2;
let vertexShaderCode;
let fragmentShaderCode;
let mouseBindingElement;
let canvas;
let mandelbrotView;
let juliaView;
let centerSpan;
let scaleSpan;
let hueSpan;
let saturationSpan;
let intensitySpan;
let paletteSpan;
let clickPosSpan;
export function init() {
    window.onload = () => doInit();
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        mouseBindingElement = document.getElementById("mouse-binding");
        mouseBindingElement.onkeypress = e => {
            e.preventDefault();
        };
        window.onkeypress = (e) => {
            const key = e.key.toUpperCase();
            const act = action(key);
            if (act != null) {
                mouseBindingElement.value = act;
            }
        };
        mandelbrotView = yield view(false, "canvas-gl", center, scale);
        juliaView = yield view(true, "julia-gl", [0, 0], 4);
        centerSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(center)
            .map(pos => pos.map(c => c.toPrecision(3)))
            .map(pos => "( " + pos[0] + ", " + pos[1] + ")")
            .to(Gear.text("center")));
        scaleSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(scale)
            .map(s => s.toPrecision(3).toString())
            .to(Gear.text("scale")));
        hueSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(mandelbrotView.hue)
            .map(h => h.toPrecision(3).toString())
            .to(Gear.text("hue")));
        saturationSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(mandelbrotView.saturation)
            .map(s => s.toPrecision(3).toString())
            .to(Gear.text("saturation")));
        intensitySpan = Gear.sinkFlow(flow => flow
            .defaultsTo(mandelbrotView.intensity)
            .map(i => i.toPrecision(3).toString())
            .to(Gear.text("intensity")));
        paletteSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(mandelbrotView.palette)
            .map(s => s.toPrecision(3).toString())
            .to(Gear.text("palette")));
        clickPosSpan = Gear.sinkFlow(flow => flow
            .defaultsTo(center)
            .map(pos => pos.map(c => c.toPrecision(9)))
            .map(pos => "(" + pos[0] + ", " + pos[1] + ")")
            .to(Gear.text("clickPos")));
        canvas = Gear.ElementEvents.create("canvas-gl");
        canvas.dragging.branch(flow => flow.filter(selected("move")).producer(d => move(d)), flow => flow.filter(selected("zoom")).producer(d => zoom(d)), flow => flow.filter(selected("color")).producer(d => colorize(d)), flow => flow.filter(selected("intensity")).producer(d => intensity(d)), flow => flow.filter(selected("palette")).producer(d => palette(d)), flow => flow.filter(selected("julia")).producer(d => julia(d)));
        Gear.Flow.from(canvas.clickPos, canvas.touchStartPos.map(ps => ps[0]))
            .map(pos => toComplexNumber(pos))
            .branch(flow => flow.to(clickPosSpan))
            .filter(selected("music"))
            .producer(c => play(c));
    });
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
    for (let i = 0; i < audioBuffer.length && vec2.length(z) < 2.0; i++) {
        const [x, y] = z;
        z = vec2.add([x * x - y * y, 2 * x * y], c);
        channel1[i] = z[0] / 2;
        channel2[i] = z[1] / 2;
        sum1 += channel1[i];
        sum2 += channel2[i];
    }
    if (vec2.length(z) < 2.0) {
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
function toComplexNumber(pos) {
    return vec2.add(vec2.scale(toVector(pos), scale), center);
}
function toVector(pos) {
    return vec2.add(vec2.div(pos, [canvas.element.clientWidth / 2, -canvas.element.clientHeight / 2]), [-1, 1]);
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
function selected(value) {
    return () => mouseBindingElement.value == value;
}
function zoom(dragging) {
    const delta = calculateDelta(dragging.startPos, dragging.pos);
    const power = -delta[1];
    if (power != 0) {
        const centerToStart = calculateDelta(canvas.center, dragging.startPos, scale);
        const factor = Math.pow(16, power);
        const newScale = scale * factor;
        const newCenter = vec2.add(center, vec2.scale(centerToStart, 1 - factor));
        if (dragging.end) {
            scale = newScale;
            center = newCenter;
        }
        mandelbrotView.scale = newScale;
        mandelbrotView.center = newCenter;
        scaleSpan.consumer(newScale);
        centerSpan.consumer(newCenter);
    }
}
function move(dragging) {
    const delta = calculateDelta(dragging.startPos, dragging.pos, scale);
    if (vec2.length(delta) > 0) {
        const newCenter = vec2.max(vec2.min(vec2.sub(center, delta), [+4, +4]), [-4, -4]);
        if (dragging.end) {
            center = newCenter;
        }
        mandelbrotView.center = newCenter;
        centerSpan.consumer(newCenter);
    }
}
function colorize(dragging) {
    const hue = 2 * dragging.pos[0] / canvas.element.clientWidth;
    const saturation = 1 - dragging.pos[1] / canvas.element.clientHeight;
    mandelbrotView.setColor(hue, saturation);
    juliaView.setColor(hue, saturation);
    hueSpan.consumer(hue);
    saturationSpan.consumer(saturation);
}
function intensity(dragging) {
    const intensity = 1 - dragging.pos[1] / canvas.element.clientWidth;
    mandelbrotView.intensity = intensity;
    juliaView.intensity = intensity;
    intensitySpan.consumer(intensity);
}
function palette(dragging) {
    const p = 1.5 - 2 * dragging.pos[1] / canvas.element.clientWidth;
    const palette = p > 1 ? 1 : p < 0 ? 0 : p;
    mandelbrotView.palette = palette;
    juliaView.palette = palette;
    paletteSpan.consumer(palette);
}
function julia(dragging) {
    const complexNumber = toComplexNumber(dragging.pos);
    juliaView.juliaNumber = complexNumber;
}
function calculateDelta(pos1, pos2, scale = 1) {
    return vec2.div(vec2.scale(vec2.sub(pos2, pos1), 2 * scale), [canvas.element.clientWidth, -canvas.element.clientHeight]);
}
//# sourceMappingURL=toy.js.map