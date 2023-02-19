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
import * as gearx from "../utils/gear.js";
import * as v from "./view.js";
import * as dragging from "../utils/dragging.js";
const viewMatrix = aether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0]);
export function init() {
    window.onload = () => doInit();
}
function doInit() {
    return __awaiter(this, void 0, void 0, function* () {
        const scalarFieldModule = yield aether.loadScalarFieldModule();
        const scalarFieldInstance = scalarFieldModule.newInstance();
        const view = yield v.newView("canvas-gl");
        view.matView = viewMatrix;
        view.focalLength = Math.pow(2, 1.5);
        new Toy(view, scalarFieldInstance);
    });
}
class Toy {
    constructor(view, scalarFieldInstance) {
        this.scalarFieldInstance = scalarFieldInstance;
        this.meshComputer = new gear.DeferredComputation(() => this.scalarFieldInstance.vertices);
        const canvas = gear.elementEvents("canvas-gl");
        const sizeManager = new gearx.CanvasSizeManager(true);
        sizeManager.observe(canvas.element, () => view.resize());
        const rotationDragging = new dragging.RotationDragging(() => view.matPositions, () => aether.mat4.mul(view.matProjection, view.matView), 4);
        const focalRatioDragging = new dragging.RatioDragging(() => view.matProjection[0][0]);
        const cases = {
            contourValue: gear.Value.from(),
            rotation: gear.Value.from(),
            focalLength: gear.Value.from(),
            shininess: gear.Value.from(),
            fogginess: gear.Value.from(),
            lightPosition: gear.Value.from(),
            lightRadius: gear.Value.from(),
        };
        canvas.dragging.value.switch(gear.readableValue("mouse-binding").defaultsTo("rotation"), cases);
        const contourValue = cases.contourValue
            .then(gear.drag(dragging.positionDragging))
            .map(([_, y]) => y)
            .defaultsTo(0.01);
        const resolution = this.levelOfDetails();
        v.wire(view, {
            matModel: cases.rotation
                .then(gear.drag(rotationDragging))
                .defaultsTo(rotationDragging.currentValue()),
            matView: gear.Value.from()
                .defaultsTo(view.matView),
            focalLength: cases.focalLength
                .then(gear.drag(focalRatioDragging))
                .defaultsTo(focalRatioDragging.currentValue()),
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
            vertices: gear.Value.from(resolution.then((r, c) => this.contourSurfaceDataForResolution(r, c)), contourValue.then((v, c) => this.contourSurfaceDataForValue(v, c)), gear.readableValue("function").defaultsTo("xyz").then((f, c) => this.contourSurfaceDataForFunction(f, c)))
        });
        gear.text("lod").value = resolution.map(lod => lod.toString());
        gear.elementEvents("save").click.value.attach(() => this.saveModel());
    }
    levelOfDetails() {
        const inc = gear.elementEvents("lod-inc").click.value.map(() => +8);
        const dec = gear.elementEvents("lod-dec").click.value.map(() => -8);
        const flow = gear.Value.from(inc, dec).reduce((i, lod) => this.clamp(lod + i, 32, 96), 64);
        return flow;
    }
    clamp(n, min, max) {
        return n < min ? min : (n > max ? max : n);
    }
    fieldColor(contourValue = this.scalarFieldInstance.contourValue) {
        return contourValue > 0 ?
            [1, 0, (1 - contourValue) / (1 + contourValue), 1] :
            [1 - (1 + contourValue) / (1 - contourValue), 1, 0, 1];
    }
    getFieldFunction(functionName) {
        switch (functionName) {
            case "xyz": return xyz;
            case "envelopedCosine": return envelopedCosine;
            default: return xyz;
        }
    }
    contourSurfaceDataForValue(value, meshConsumer) {
        this.scalarFieldInstance.contourValue = value;
        this.meshComputer.perform().then(meshConsumer);
    }
    contourSurfaceDataForResolution(resolution, meshConsumer) {
        this.scalarFieldInstance.resolution = resolution;
        this.meshComputer.perform().then(meshConsumer);
    }
    contourSurfaceDataForFunction(functionName, meshConsumer) {
        this.scalarFieldInstance.sampler = this.getFieldFunction(functionName);
        this.meshComputer.perform().then(meshConsumer);
    }
    saveModel() {
        const model = gltf.createModel("ScalarField", this.scalarFieldInstance.vertices);
        const canvas = document.getElementById("canvas-gl");
        gearx.save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', 'ScalarField.gltf');
        gearx.save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', 'ScalarField.bin');
        gearx.save(canvas.toDataURL("image/png"), 'image/png', 'ScalarField.png');
    }
}
const twoPi = 2 * Math.PI;
function xyz(x, y, z) {
    return [
        y * z,
        z * x,
        x * y,
        x * y * z
    ];
}
function envelopedCosine(x, y, z) {
    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;
    if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
        const piX2 = Math.PI * x2;
        const piY2 = Math.PI * y2;
        const piZ2 = Math.PI * z2;
        const envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8;
        const piX = Math.PI * x;
        const piY = Math.PI * y;
        const piZ = Math.PI * z;
        const value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ);
        const dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4;
        const dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4;
        const dValueDX = -twoPi * Math.sin(2 * piX);
        const dValueDY = -twoPi * Math.sin(2 * piY);
        const dValueDZ = -twoPi * Math.sin(2 * piZ);
        return [
            dEnvelopeDX * value + envelope * dValueDX,
            dEnvelopeDY * value + envelope * dValueDY,
            dEnvelopeDZ * value + envelope * dValueDZ,
            envelope * value / 3
        ];
    }
    else {
        return [0, 0, 0, 0];
    }
}
//# sourceMappingURL=toy.js.map