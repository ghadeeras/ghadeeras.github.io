import { aether, gear } from "/gen/libs.js";
import { view } from "./view.js";
import { positionDragging } from "../utils/dragging.js";
let audioContext;
export const gitHubRepo = "ghadeeras.github.io/tree/master/src/mandelbrot";
export const huds = {
    "monitor": "monitor-button"
};
export async function init() {
    const loop = await Toy.loop();
    loop.run();
}
class Toy {
    constructor(mandelbrotView) {
        this.mandelbrotView = mandelbrotView;
        this.moveTarget = gear.loops.draggingTarget(gear.property(this, "transformation"), new Move(this.mandelbrotView));
        this.zoomTarget = gear.loops.draggingTarget(gear.property(this, "transformation"), new Zoom(this.mandelbrotView));
        this.colorTarget = gear.loops.draggingTarget(mapped(gear.property(this, "color"), ([x, y]) => aether.vec2.of(x + 1, (y + 1) / 2)), positionDragging);
        this.intensityTarget = gear.loops.draggingTarget(mapped(gear.property(this.mandelbrotView, "intensity"), ([_, y]) => (y + 1) / 2), positionDragging);
        this.intensityWatch = gear.required(document.getElementById("intensity"));
        this.hueWatch = gear.required(document.getElementById("hue"));
        this.saturationWatch = gear.required(document.getElementById("saturation"));
        this.centerWatch = gear.required(document.getElementById("center"));
        this.scaleWatch = gear.required(document.getElementById("scale"));
        this.posWatch = gear.required(document.getElementById("clickPos"));
        this.watchesUpdate = new gear.DeferredComputation(() => {
            this.centerWatch.innerText = toFixedVec(this.mandelbrotView.center, 9);
            this.scaleWatch.innerText = toFixed(this.mandelbrotView.scale, 9);
            this.hueWatch.innerText = toFixed(this.mandelbrotView.hue);
            this.saturationWatch.innerText = toFixed(this.mandelbrotView.saturation);
            this.intensityWatch.innerText = toFixed(this.mandelbrotView.intensity);
        });
    }
    static async loop() {
        const mandelbrotView = await view(Toy.descriptor.input.pointers.canvas.element, [-0.75, 0], 2);
        return gear.loops.newLoop(new Toy(mandelbrotView), Toy.descriptor);
    }
    inputWiring(inputs) {
        return {
            pointers: {
                canvas: {
                    defaultDraggingTarget: this.zoomTarget,
                    primaryButton: { onPressed: () => this.click(...inputs.pointers.canvas.position, inputs.pointers.canvas.draggingTarget == null) }
                }
            },
            keys: {
                move: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.moveTarget },
                zoom: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.zoomTarget },
                color: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.colorTarget },
                intensity: { onPressed: () => inputs.pointers.canvas.draggingTarget = this.intensityTarget },
                xray: { onPressed: () => this.mandelbrotView.xray = !this.mandelbrotView.xray },
                crosshairs: { onPressed: () => this.mandelbrotView.crosshairs = !this.mandelbrotView.crosshairs },
                sound: { onPressed: () => inputs.pointers.canvas.draggingTarget = null },
            }
        };
    }
    outputWiring() {
        return {
            onRender: () => this.mandelbrotView.render(),
            canvases: {
                scene: { onResize: () => this.mandelbrotView.resize() }
            },
        };
    }
    animate() {
    }
    click(x, y, soundOn) {
        this.posWatch.innerText = toFixedVec([x, y]);
        if (soundOn) {
            const aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
            const c = aether.vec2.add(aether.vec2.scale(aether.vec2.mul([x, y], aspectRatio > 1 ? [aspectRatio, 1] : [1, 1 / aspectRatio]), this.mandelbrotView.scale), this.mandelbrotView.center);
            play(c);
        }
    }
    get canvas() {
        return this.mandelbrotView.canvas;
    }
    get transformation() {
        return this.mandelbrotView;
    }
    set transformation(t) {
        this.mandelbrotView.center = t.center;
        this.mandelbrotView.scale = t.scale;
        this.watchesUpdate.perform();
    }
    set color([h, s]) {
        this.mandelbrotView.setColor(h, s);
        this.watchesUpdate.perform();
    }
    set intensity(i) {
        this.mandelbrotView.intensity = i;
        this.watchesUpdate.perform();
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
            move: {
                physicalKeys: [["KeyM"]],
                virtualKeys: "#control-m",
            },
            zoom: {
                physicalKeys: [["KeyZ"]],
                virtualKeys: "#control-z",
            },
            color: {
                physicalKeys: [["KeyC"]],
                virtualKeys: "#control-c",
            },
            intensity: {
                physicalKeys: [["KeyI"]],
                virtualKeys: "#control-i",
            },
            xray: {
                physicalKeys: [["KeyX"]],
                virtualKeys: "#control-x",
            },
            crosshairs: {
                physicalKeys: [["KeyH"]],
                virtualKeys: "#control-h",
            },
            sound: {
                physicalKeys: [["KeyN"]],
                virtualKeys: "#control-n",
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
            element: "fps-watch"
        },
        styling: {
            pressedButton: "pressed"
        },
    },
};
function toFixedVec(v, digits = 3) {
    const coords = v.map(c => toFixed(c, digits));
    const commaSeparatedCoords = coords[0].concat(...coords.slice(1).map(s => `, ${s}`));
    return `(${commaSeparatedCoords})`;
}
function toFixed(c, digits = 3) {
    let s = c.toFixed(digits);
    return s.startsWith("-") ? s : " " + s;
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
class Zoom {
    constructor(view) {
        this.view = view;
    }
    begin(value, from) {
        const initial = {
            center: value.center,
            scale: value.scale
        };
        const aspect = this.view.canvas.width / this.view.canvas.height;
        const bounds = aspect >= 1 ? [aspect, 1] : [1, 1 / aspect];
        return to => {
            const delta = aether.vec2.mul(calculateDelta(from, to), bounds);
            const power = -delta[1];
            const factor = 16 ** power;
            return power == 0 ? initial : {
                scale: initial.scale * factor,
                center: aether.vec2.sub(initial.center, aether.vec2.scale(calculateDelta([0, 0], aether.vec2.mul(from, bounds), initial.scale), factor - 1))
            };
        };
    }
    end(value) {
        return value;
    }
}
class Move {
    constructor(view) {
        this.view = view;
    }
    begin(value, from) {
        const initial = {
            center: value.center,
            scale: value.scale
        };
        const aspect = this.view.canvas.width / this.view.canvas.height;
        const bounds = aspect >= 1 ? [aspect, 1] : [1, 1 / aspect];
        return to => {
            const delta = aether.vec2.mul(calculateDelta(from, to, initial.scale), bounds);
            return {
                scale: initial.scale,
                center: aether.vec2.max(aether.vec2.min(aether.vec2.sub(initial.center, delta), [+4, +4]), [-4, -4])
            };
        };
    }
    end(value) {
        return value;
    }
}
function calculateDelta(pos1, pos2, scale = 1) {
    return aether.vec2.scale(aether.vec2.sub(pos2, pos1), scale);
}
function mapped(property, mapper) {
    const pos = [[0, 0]];
    return {
        getter: () => pos[0],
        setter: b => {
            pos[0] = b;
            property.setter(mapper(b));
        }
    };
}
//# sourceMappingURL=toy.js.map