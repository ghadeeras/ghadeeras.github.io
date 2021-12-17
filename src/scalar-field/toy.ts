import * as ether from "../../ether/latest/index.js"
import * as gear from "../../gear/latest/index.js"
import * as v from "./view.js"
import * as dragging from "../utils/dragging.js"
import { save } from "../utils/misc.js"
import { createModel } from "../djee/gltf.gen.js"

const viewMatrix = ether.mat4.lookAt([-1, 1, 4], [0, 0, 0], [0, 1, 0])
const projectionMatrix = ether.mat4.projection(Math.pow(2, 1.5))

export function init() {
    window.onload = () => doInit()
}

async function doInit() {
    const scalarFieldModule = await ether.loadScalarFieldModule()
    const scalarFieldInstance = scalarFieldModule.newInstance()
    const view = await v.newView("canvas-gl")
    view.matView = viewMatrix
    view.matProjection = projectionMatrix
    const toy = new Toy(view, scalarFieldInstance)
}

class Toy {

    private meshComputer: gear.DeferredComputation<Float32Array> = new gear.DeferredComputation(() => this.scalarFieldInstance.vertices)

    constructor(view: v.View, private scalarFieldInstance: ether.ScalarFieldInstance) {
        const canvas = gear.elementEvents("canvas-gl")
        const rotationDragging = new dragging.RotationDragging(() => view.matPositions, () => ether.mat4.mul(view.matProjection, view.matView), 4)
        const focalRatioDragging = new dragging.RatioDragging(() => view.matProjection[0][0])

        const cases = {
            contourValue: gear.Value.from<gear.Dragging>(),
            rotation: gear.Value.from<gear.Dragging>(),
            focalRatio: gear.Value.from<gear.Dragging>(),
            shininess: gear.Value.from<gear.Dragging>(),
            fogginess: gear.Value.from<gear.Dragging>(),
            lightPosition: gear.Value.from<gear.Dragging>(),
            lightRadius: gear.Value.from<gear.Dragging>(),
        }
        
        canvas.dragging.value.switch(gear.readableValue("mouse-binding").defaultsTo("rotation"), cases) 

        const contourValue = cases.contourValue
            .then(gear.drag(dragging.positionDragging))
            .map(([x, y]) => y)
            .defaultsTo(0.01)
        const resolution = this.levelOfDetails()

        v.wire(view, {
            matModel: cases.rotation
                .then(gear.drag(rotationDragging))
                .defaultsTo(rotationDragging.currentValue()),

            matView: gear.Value.from<ether.Mat<4>>()
                .defaultsTo(view.matView),
            
            matProjection: cases.focalRatio
                .then(gear.drag(focalRatioDragging))
                .defaultsTo(focalRatioDragging.currentValue())
                .map(ratio => ether.mat4.projection(ratio)),

            color: contourValue
                .map(v => this.fieldColor(v)),

            shininess: cases.shininess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(view.shininess),

            fogginess: cases.fogginess
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(view.fogginess),
            
            lightPosition: cases.lightPosition
                .then(gear.drag(dragging.positionDragging))
                .map(p => ether.vec2.length(p) > 1 ? ether.vec2.unit(p) : p)
                .map(([x, y]) => ether.vec2.of(x * Math.PI / 2, y * Math.PI / 2))
                .map(([x, y]) => ether.vec4.of(2 * Math.sin(x) * Math.cos(y), 2 * Math.sin(y), 2 * Math.cos(x) * Math.cos(y), 1))
                .defaultsTo(ether.vec4.of(0, 0, 2, 1)),
            
            lightRadius: cases.lightRadius
                .then(gear.drag(dragging.positionDragging))
                .map(([x, y]) => (y + 1) / 2)
                .defaultsTo(0.1),
            
            vertices: gear.Value.from(
                resolution.then((r, c) => this.contourSurfaceDataForResolution(r, c)),
                contourValue.then((v, c) => this.contourSurfaceDataForValue(v, c)),
                gear.readableValue("function").defaultsTo("xyz").then((f, c) => this.contourSurfaceDataForFunction(f, c))
            )
        })
        
        gear.text("lod").value = resolution.map(lod => lod.toString())
        gear.elementEvents("save").click.value.attach(() => this.saveModel())
    }

    levelOfDetails() {
        const inc = gear.elementEvents("lod-inc").click.value.map(() => +8)
        const dec = gear.elementEvents("lod-dec").click.value.map(() => -8)
        const flow = gear.Value.from(inc, dec).reduce((i, lod) => this.clamp(lod + i, 32, 96), 64)
        return flow
    }

    clamp(n: number, min: number, max: number) {
        return n < min ? min : (n > max ? max : n)
    }

    fieldColor(contourValue: number = this.scalarFieldInstance.contourValue): ether.Vec<4> {
        return contourValue > 0 ?
            [1, 0, (1 - contourValue) / (1 + contourValue), 1] : 
            [1 - (1 + contourValue) / (1 - contourValue), 1, 0, 1] 
    }

    getFieldFunction(functionName: string) {
        switch (functionName) {
            case "xyz": return xyz
            case "envelopedCosine": return envelopedCosine
            default: return xyz
        }
    }

    contourSurfaceDataForValue(value: number, meshConsumer: gear.Consumer<Float32Array>) {
        this.scalarFieldInstance.contourValue = value
        this.meshComputer.perform().then(meshConsumer)
    }

    contourSurfaceDataForResolution(resolution: number, meshConsumer: gear.Consumer<Float32Array>) {
        this.scalarFieldInstance.resolution = resolution
        this.meshComputer.perform().then(meshConsumer)
    }

    contourSurfaceDataForFunction(functionName: string, meshConsumer: gear.Consumer<Float32Array>) {
        this.scalarFieldInstance.sampler = this.getFieldFunction(functionName)
        this.meshComputer.perform().then(meshConsumer)
    }

    saveModel() {
        const model = createModel("ScalarField", this.scalarFieldInstance.vertices)
        const canvas = document.getElementById("canvas-gl") as HTMLCanvasElement

        save(URL.createObjectURL(new Blob([JSON.stringify(model.model)])), 'text/json', 'ScalarField.gltf')
        save(URL.createObjectURL(new Blob([model.binary])), 'application/gltf-buffer', 'ScalarField.bin')
        save(canvas.toDataURL("image/png"), 'image/png', 'ScalarField.png')
    }

}

const twoPi = 2 * Math.PI

function xyz(x: number, y: number, z: number): ether.Vec<4> {
    return [
        y * z,
        z * x,
        x * y,
        x * y * z
    ]
}

function envelopedCosine(x: number, y: number, z: number): ether.Vec<4> {
    const x2 = x * x
    const y2 = y * y
    const z2 = z * z
    if (x2 <= 1 && y2 <= 1 && z2 <= 1) {
        const piX2 = Math.PI * x2
        const piY2 = Math.PI * y2
        const piZ2 = Math.PI * z2
        const envelope = (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 8

        const piX = Math.PI * x
        const piY = Math.PI * y
        const piZ = Math.PI * z
        const value = Math.cos(2 * piX) + Math.cos(2 * piY) + Math.cos(2 * piZ)

        const dEnvelopeDX = -piX * Math.sin(piX2) * (Math.cos(piY2) + 1) * (Math.cos(piZ2) + 1) / 4 
        const dEnvelopeDY = -piY * Math.sin(piY2) * (Math.cos(piX2) + 1) * (Math.cos(piZ2) + 1) / 4 
        const dEnvelopeDZ = -piZ * Math.sin(piZ2) * (Math.cos(piX2) + 1) * (Math.cos(piY2) + 1) / 4 

        const dValueDX = -twoPi * Math.sin(2 * piX)
        const dValueDY = -twoPi * Math.sin(2 * piY)
        const dValueDZ = -twoPi * Math.sin(2 * piZ)

        return [
            dEnvelopeDX * value + envelope * dValueDX,
            dEnvelopeDY * value + envelope * dValueDY,
            dEnvelopeDZ * value + envelope * dValueDZ,
            envelope * value / 3
        ]
    } else {
        return [0, 0, 0, 0]
    }
}
