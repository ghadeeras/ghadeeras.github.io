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
import { gltf } from "../djee/index.js";
import { Carving } from "./carving.js";
import * as v from "../scalar-field/view.js";
import * as dragging from "../utils/dragging.js";
import * as misc from "../utils/misc.js";
const viewMatrix = aether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0]);
const projectionMatrix = aether.mat4.projection(4);
export function init() {
    window.onload = doInit;
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const view = yield v.newView("canvas-gl");
        view.matView = viewMatrix;
        view.matProjection = projectionMatrix;
        const picker = yield view.picker();
        const scalarFieldModule = yield aether.loadScalarFieldModule();
        const stone = scalarFieldModule.newInstance();
        stone.resolution = 64;
        stone.sampler = field;
        stone.contourValue = 0.5;
        new Toy(stone, scalarFieldModule, view, picker);
    });
}
class Toy {
    constructor(stone, scalarFieldModule, view, picker) {
        this.stone = stone;
        this.scalarFieldModule = scalarFieldModule;
        this.meshComputer = new gear.DeferredComputation(() => this.stone.vertices);
        const canvas = gear.elementEvents("canvas-gl");
        const rotationDragging = new dragging.RotationDragging(() => view.matPositions, () => aether.mat4.mul(view.matProjection, view.matView), 4);
        const focalRatioDragging = new dragging.RatioDragging(() => view.matProjection[0][0]);
        this.carving = new Carving(() => this.stone, () => modelViewProjectionMatrixOf(view), picker, scalarFieldModule, brush);
        const cases = {
            contourValue: gear.Value.from(),
            carving: gear.Value.from(),
            rotation: gear.Value.from(),
            focalRatio: gear.Value.from(),
            shininess: gear.Value.from(),
            fogginess: gear.Value.from(),
            lightPosition: gear.Value.from(),
            lightRadius: gear.Value.from(),
        };
        canvas.dragging.value.switch(gear.readableValue("mouse-binding").defaultsTo("rotation"), cases);
        const contourValue = gear.Value.from(cases.contourValue
            .then(gear.drag(dragging.positionDragging))
            .map(([_, y]) => this.clamp((y + 1) / 2, 0, 1))
            .defaultsTo(this.stone.contourValue), gear.elementEvents("reset-contour").click.value.map(() => 0.5));
        const resolution = this.levelOfDetails();
        const stoneValue = gear.Value.from(cases.carving.then(gear.drag(this.carving)), resolution.map(r => this.stoneWithResolution(r)), contourValue.map(v => this.stoneWithContourValue(v)), gear.elementEvents("undo").click.value.map(() => this.carving.undo()), dropOn(canvas.element)
            .filter(e => e.dataTransfer != null)
            .then(asyncEffect(data))
            .map(buffer => this.deserializeStone(buffer))).defaultsTo(this.stone);
        v.wire(view, {
            matModel: cases.rotation
                .then(gear.drag(rotationDragging))
                .defaultsTo(rotationDragging.currentValue()),
            matView: gear.Value.from()
                .defaultsTo(view.matView),
            matProjection: cases.focalRatio
                .then(gear.drag(focalRatioDragging))
                .defaultsTo(focalRatioDragging.currentValue())
                .map(ratio => aether.mat4.projection(ratio)),
            color: contourValue
                .map(v => this.fieldColor(v)),
            shininess: cases.shininess
                .then(gear.drag(dragging.positionDragging))
                .map(([_, y]) => (y + 1) / 2)
                .defaultsTo(view.shininess),
            fogginess: cases.fogginess
                .then(gear.drag(dragging.positionDragging))
                .map(([_, y]) => (y + 1) / 2)
                .defaultsTo(view.fogginess),
            lightPosition: cases.lightPosition
                .then(gear.drag(dragging.positionDragging))
                .map(p => aether.vec2.length(p) > 1 ? aether.vec2.unit(p) : p)
                .map(([x, y]) => aether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
                .map(([x, y]) => aether.vec4.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1))
                .defaultsTo(aether.vec4.of(0, 0, 2, 1)),
            lightRadius: cases.lightRadius
                .then(gear.drag(dragging.positionDragging))
                .map(([_, y]) => (y + 1) / 2)
                .defaultsTo(0.1),
            vertices: stoneValue.then((s, c) => this.contourSurfaceDataForStone(s, c)),
        });
        gear.text("lod").value = stoneValue.map(s => s.resolution).map(lod => lod.toString());
        gear.elementEvents("export").click.value.attach(() => this.exportModel());
        gear.elementEvents("save").click.value.attach(() => this.saveModel());
    }
    levelOfDetails() {
        const inc = gear.elementEvents("lod-inc").click.value.map(() => +8);
        const dec = gear.elementEvents("lod-dec").click.value.map(() => -8);
        const flow = gear.Value.from(inc, dec)
            .map(i => this.clamp(this.stone.resolution + i, 32, 96))
            .defaultsTo(this.stone.resolution);
        return flow;
    }
    clamp(n, min, max) {
        return n < min ? min : (n > max ? max : n);
    }
    fieldColor(contourValue = this.stone.contourValue) {
        return [0.5, contourValue, 0.5, 1];
    }
    contourSurfaceDataForStone(stone, meshConsumer) {
        this.stone = stone;
        this.meshComputer.perform().then(meshConsumer);
    }
    stoneWithContourValue(value) {
        this.stone.contourValue = value;
        return this.stone;
    }
    stoneWithResolution(resolution) {
        this.stone.resolution = resolution;
        return this.stone;
    }
    exportModel() {
        const fileName = document.getElementById("file-name");
        const model = gltf.createModel(fileName.value, this.stone.vertices);
        misc.save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', `${fileName.value}.gltf`);
        misc.save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', `${fileName.value}.bin`);
    }
    saveModel() {
        const fileName = document.getElementById("file-name");
        const buffer = this.serializeStone();
        misc.save(URL.createObjectURL(new Blob([buffer])), 'application/binary', `${fileName.value}.ssf`);
    }
    serializeStone() {
        const samplesCount = Math.pow((this.stone.resolution + 1), 3);
        const vectorSize = 4;
        const headerSize = 4;
        const buffer = new ArrayBuffer(headerSize * Uint16Array.BYTES_PER_ELEMENT +
            samplesCount * vectorSize * Float64Array.BYTES_PER_ELEMENT);
        const header = new Uint16Array(buffer, 0, headerSize);
        const samples = new Float64Array(buffer, header.byteLength);
        header[0] = "SF".charCodeAt(0) + ("SF".charCodeAt(1) << 8);
        header[1] = this.stone.resolution;
        header[2] = this.stone.resolution;
        header[3] = this.stone.resolution;
        for (let k = 0; k <= this.stone.resolution; k++) {
            const z = 2 * k / this.stone.resolution - 1;
            const jOffset = k * this.stone.resolution;
            for (let j = 0; j <= this.stone.resolution; j++) {
                const y = 2 * j / this.stone.resolution - 1;
                const iOffset = (jOffset + j) * this.stone.resolution;
                for (let i = 0; i <= this.stone.resolution; i++) {
                    const x = 2 * i / this.stone.resolution - 1;
                    const offset = (iOffset + i) * vectorSize;
                    samples.set(this.stone.getNearest(x, y, z), offset);
                }
            }
        }
        return buffer;
    }
    deserializeStone(buffer) {
        const vectorSize = 4;
        const headerSize = 4;
        const header = new Uint16Array(buffer, 0, headerSize);
        const samples = new Float64Array(buffer, header.byteLength);
        const s = String.fromCharCode(header[0] & 0xFF) + String.fromCharCode(header[0] >>> 8);
        if (s !== "SF") {
            alert("Invalid file format!");
            return this.stone;
        }
        const xRes = header[1];
        const yRes = header[2];
        const zRes = header[3];
        const samplesCount = (xRes + 1) * (yRes + 1) * (zRes + 1);
        if (samplesCount * vectorSize !== samples.length) {
            alert("Invalid file format!");
            return this.stone;
        }
        const stone = this.scalarFieldModule.newInstance();
        stone.resolution = Math.round(Math.pow((xRes * yRes * zRes), (1 / 3)));
        stone.sampler = (x, y, z) => {
            const i = Math.round((x + 1) * xRes / 2);
            const j = Math.round((y + 1) * yRes / 2);
            const k = Math.round((z + 1) * zRes / 2);
            const offset = ((k * yRes + j) * xRes + i) * vectorSize;
            return offset < samples.length ?
                aether.vec4.from(samples, offset) :
                aether.vec4.of(0, 0, 0, 0);
        };
        const newStone = this.carving.undo();
        newStone.resolution = stone.resolution;
        newStone.sampler = (x, y, z) => stone.get(x, y, z);
        return newStone;
    }
}
function dropOn(element) {
    element.ondragover = e => {
        e.preventDefault();
    };
    return gear.Source.from((c) => element.ondrop = c).value;
}
function data(e) {
    e.preventDefault();
    if (e.dataTransfer) {
        const item = e.dataTransfer.items[0];
        return item.kind == 'file' ?
            misc.required(item.getAsFile()).arrayBuffer() :
            asURL(item).then(fetch).then(response => response.arrayBuffer());
    }
    else {
        return Promise.reject("Not a data transfer!");
    }
}
function asURL(transferItem) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            try {
                transferItem.getAsString(resolve);
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
function asyncEffect(mapper) {
    return (v, c) => mapper(v).then(c);
}
const twoPi = 2 * Math.PI;
function modelViewProjectionMatrixOf(view) {
    return aether.mat4.mul(view.matProjection, aether.mat4.mul(view.matView, view.matPositions));
}
function field(x, y, z) {
    const l = aether.vec3.length([x, y, z]);
    const f = l <= 1 ?
        l >= 0.5 ? (1 - Math.cos(twoPi * l)) / 2 : 1 :
        0;
    const g = l <= 1 ?
        l >= 0.5 ? Math.PI * Math.sin(twoPi * l) / l : 0 :
        0;
    return [
        x * g,
        y * g,
        z * g,
        f
    ];
}
function brush(x, y, z) {
    const l = aether.vec3.length([x, y, z]);
    const f = l <= 1 ? (1 + Math.cos(Math.PI * l)) / 2 : 0;
    const g = l <= 1 ?
        l > Math.sqrt(Number.EPSILON) ?
            (-Math.PI / 2) * Math.sin(Math.PI * l) / l :
            -Math.PI * Math.PI / 2 :
        0;
    return [
        x * g,
        y * g,
        z * g,
        f
    ];
}
//# sourceMappingURL=toy.js.map